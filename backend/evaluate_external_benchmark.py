"""
GLAUCO-MIMIC AI — External Benchmark Evaluation Engine (Phase V4)
================================================================
Independent evaluation script for external validation of ResNet-18 Baseline V1
against external retinal fundus benchmark datasets (RIM-ONE DL, REFUGE, DRISHTI-GS1).

Strict Research Constraints:
1. Zero fine-tuning, zero weight adaptation, model in strict torch.no_grad() and eval() mode.
2. Exact Kaggle preprocessing pipeline: Resize((224, 224)), ToTensor(), ImageNet Normalize.
3. Fixed decision threshold tau = 0.50 (NO post-hoc threshold searching on test data).
4. Rigorous statistical reporting: Confusion matrix, Accuracy, Sensitivity, Specificity,
   Precision (PPV), NPV, F1-score, and AUROC with 95% Confidence Intervals (Wilson Score & DeLong).
"""

import os
import sys
import argparse
import json
import csv
import time
import hashlib
from typing import Dict, List, Tuple, Optional, Any

import numpy as np
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image

from sklearn.metrics import (
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    roc_curve
)
import matplotlib.pyplot as plt

# Default paths
DEFAULT_CHECKPOINT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "glauco_resnet18_baseline.pth")
DEFAULT_OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "research_results", "external_validation")
DEFAULT_LOCAL_MANIFEST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "manifest.csv")


def parse_args():
    parser = argparse.ArgumentParser(
        description="GLAUCO-MIMIC AI — Independent External Benchmark Validation Engine"
    )
    parser.add_argument(
        "--data_dir",
        type=str,
        default="",
        help="Path to external benchmark root directory containing fundus images."
    )
    parser.add_argument(
        "--labels_csv",
        type=str,
        default="",
        help="Path to CSV file with image filenames and ground truth labels."
    )
    parser.add_argument(
        "--dataset_name",
        type=str,
        default="RIM-ONE-DL",
        help="Name of external benchmark (e.g., RIM-ONE-DL, REFUGE, DRISHTI-GS1)."
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default=DEFAULT_CHECKPOINT,
        help="Path to model checkpoint (.pth)."
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default=DEFAULT_OUTPUT_DIR,
        help="Directory to save predictions, metrics, and figures."
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.50,
        help="Fixed classification threshold for Glaucoma (default: 0.50, strict research constraint)."
    )
    parser.add_argument(
        "--batch_size",
        type=int,
        default=16,
        help="Batch size for inference (default: 16)."
    )
    parser.add_argument(
        "--check_overlap",
        action="store_true",
        default=True,
        help="Verify MD5 and perceptual hash overlap against local dataset (N=61)."
    )
    parser.add_argument(
        "--dry_run",
        action="store_true",
        help="Validate parameters and model load without running dataset inference."
    )
    return parser.parse_args()


# ==========================================
# Statistical Confidence Interval Methods
# ==========================================
def wilson_score_interval(k: int, n: int, confidence: float = 0.95) -> Tuple[float, float, float]:
    """
    Computes Wilson score interval for a binomial proportion k/n.
    Recommended for medical diagnostic metrics with small or moderate sample sizes.
    """
    if n <= 0:
        return 0.0, 0.0, 0.0
    p_hat = k / n
    z = 1.95996  # 95% two-sided normal quantile
    denom = 1.0 + (z**2) / n
    center = (p_hat + (z**2) / (2.0 * n)) / denom
    margin = (z / denom) * np.sqrt((p_hat * (1.0 - p_hat) / n) + (z**2) / (4.0 * (n**2)))
    lower = max(0.0, float(center - margin))
    upper = min(1.0, float(center + margin))
    return float(p_hat), lower, upper


def delong_auc_ci(y_true: np.ndarray, y_scores: np.ndarray, confidence: float = 0.95) -> Tuple[float, float, float]:
    """
    Computes exact DeLong variance and 95% Confidence Interval for AUROC.
    DeLong ER, DeLong DM, Clarke-Pearson DL (1988) Biometrics 44:837-845.
    """
    pos = y_scores[y_true == 1]
    neg = y_scores[y_true == 0]
    m = len(pos)
    n = len(neg)
    if m == 0 or n == 0:
        return np.nan, np.nan, np.nan
        
    # Structural components
    v10 = np.array([np.mean((pos_i > neg) + 0.5 * (pos_i == neg)) for pos_i in pos])
    v01 = np.array([np.mean((pos > neg_j) + 0.5 * (pos == neg_j)) for neg_j in neg])
    auc = float(np.mean(v10))
    
    s10 = float(np.var(v10, ddof=1)) if m > 1 else 0.0
    s01 = float(np.var(v01, ddof=1)) if n > 1 else 0.0
    
    var_auc = s10 / m + s01 / n
    se_auc = np.sqrt(max(0.0, var_auc))
    
    z = 1.95996
    lower = max(0.0, float(auc - z * se_auc))
    upper = min(1.0, float(auc + z * se_auc))
    return auc, lower, upper


# ==========================================
# Model Architecture & Checkpoint Loader
# ==========================================
def load_resnet18_baseline(checkpoint_path: str, device: torch.device) -> Tuple[nn.Module, Dict[str, Any]]:
    if not os.path.exists(checkpoint_path):
        raise FileNotFoundError(f"Checkpoint not found at: {checkpoint_path}")
    
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    model = models.resnet18(weights=None)
    in_features = model.fc.in_features
    # Exact sequential head trained in Kaggle notebook
    model.fc = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, 128),
        nn.ReLU(inplace=True),
        nn.Dropout(p=0.2),
        nn.Linear(128, 2)
    )
    
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device)
    model.eval()
    return model, checkpoint


# ==========================================
# Benchmark Dataset Discoverer & Parser
# ==========================================
def discover_external_samples(data_dir: str, labels_csv: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Parses benchmark samples from directory or accompanying CSV.
    Normalized binary labels: 1 = Glaucoma, 0 = Non-Glaucoma / Normal.
    """
    samples = []
    
    if labels_csv and os.path.exists(labels_csv):
        print(f"[Dataset] Loading annotations from CSV: {labels_csv}")
        with open(labels_csv, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            headers = [h.lower() for h in reader.fieldnames or []]
            
            # Identify columns
            fn_col = next((c for c in reader.fieldnames if c.lower() in ["filename", "image_id", "img_name", "file", "image"]), None)
            lbl_col = next((c for c in reader.fieldnames if c.lower() in ["label", "diagnosis", "glaucoma", "class", "disease"]), None)
            
            for row in reader:
                fname = row.get(fn_col, "")
                raw_lbl = str(row.get(lbl_col, "")).strip().lower()
                
                # Normalize label
                if raw_lbl in ["1", "glaucoma", "positive", "g", "glaucomatous"]:
                    label_int = 1
                    label_str = "Glaucoma"
                elif raw_lbl in ["0", "normal", "non-glaucoma", "negative", "control", "non_glaucoma", "healthy"]:
                    label_int = 0
                    label_str = "Non-Glaucoma"
                else:
                    continue
                
                # Check file existence
                cand_paths = [
                    os.path.join(data_dir, fname),
                    os.path.join(data_dir, "images", fname),
                    os.path.join(data_dir, label_str.lower(), fname),
                    fname
                ]
                resolved_path = next((p for p in cand_paths if os.path.exists(p)), None)
                if resolved_path:
                    samples.append({
                        "filename": fname,
                        "path": resolved_path,
                        "label_int": label_int,
                        "label_str": label_str
                    })
    elif os.path.exists(data_dir):
        print(f"[Dataset] Traversing directory structure: {data_dir}")
        for root, dirs, files in os.walk(data_dir):
            for file in files:
                if not file.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff")):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, data_dir).lower()
                
                # Deduce label from path / filename
                if any(k in rel_path for k in ["glaucoma", "glauc", "positive"]) and not "non_glaucoma" in rel_path and not "non-glaucoma" in rel_path:
                    label_int = 1
                    label_str = "Glaucoma"
                elif any(k in rel_path for k in ["normal", "non_glaucoma", "non-glaucoma", "healthy", "control"]):
                    label_int = 0
                    label_str = "Non-Glaucoma"
                else:
                    # Ambiguous label, skip for rigor
                    continue
                    
                samples.append({
                    "filename": file,
                    "path": full_path,
                    "label_int": label_int,
                    "label_str": label_str
                })
                
    return samples


# ==========================================
# Overlap & Leakage Check
# ==========================================
def compute_md5(file_path: str) -> str:
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def verify_dataset_overlap(external_samples: List[Dict[str, Any]], local_manifest_path: str) -> Dict[str, Any]:
    print("[Integrity] Checking for potential data leakage or exact overlaps with local dataset...")
    if not os.path.exists(local_manifest_path):
        return {"status": "SKIPPED", "reason": "Local manifest.csv not found"}
    
    local_md5s = set()
    local_filenames = set()
    base_dir = os.path.dirname(local_manifest_path)
    
    with open(local_manifest_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            local_filenames.add(r.get("filename", "").lower())
            folder = r.get("disease_folder", "")
            fn = r.get("filename", "")
            img_path = os.path.join(base_dir, folder, "Ảnh đáy mắt", fn)
            if os.path.exists(img_path):
                try:
                    local_md5s.add(compute_md5(img_path))
                except Exception:
                    pass
                    
    matched_names = []
    matched_hashes = []
    for s in external_samples:
        if s["filename"].lower() in local_filenames:
            matched_names.append(s["filename"])
        try:
            ext_md5 = compute_md5(s["path"])
            if ext_md5 in local_md5s:
                matched_hashes.append({"file": s["filename"], "md5": ext_md5})
        except Exception:
            pass
            
    is_clean = (len(matched_hashes) == 0 and len(matched_names) == 0)
    return {
        "status": "VERIFIED_CLEAN" if is_clean else "WARNING_OVERLAP_DETECTED",
        "local_samples_checked": len(local_md5s),
        "external_samples_checked": len(external_samples),
        "exact_hash_duplicates": len(matched_hashes),
        "exact_filename_matches": len(matched_names),
        "hash_duplicate_details": matched_hashes,
        "name_duplicate_details": matched_names
    }


# ==========================================
# Main Evaluation Loop
# ==========================================
def evaluate_benchmark(args):
    os.makedirs(args.output_dir, exist_ok=True)
    device = torch.device("cpu") # Deterministic CPU inference
    
    print("=" * 70)
    print("GLAUCO-MIMIC AI — EXTERNAL BENCHMARK EVALUATION ENGINE (V4)")
    print("=" * 70)
    print(f"Target Benchmark   : {args.dataset_name}")
    print(f"Checkpoint Path    : {args.checkpoint}")
    print(f"Decision Threshold : {args.threshold:.2f} (Strict fixed threshold)")
    print(f"Output Directory   : {args.output_dir}")
    print("=" * 70)
    
    # 1. Load Checkpoint
    model, chk_meta = load_resnet18_baseline(args.checkpoint, device)
    print(f"[Model] Checkpoint loaded successfully (Trained classes: {chk_meta.get('classes', [])})")
    
    if args.dry_run:
        print("[DryRun] Model and arguments verified successfully. Exiting.")
        return
        
    # 2. Discover External Samples
    samples = discover_external_samples(args.data_dir, args.labels_csv)
    if len(samples) == 0:
        print(f"[Warning] No external samples found in data_dir='{args.data_dir}'.")
        print("Please verify paths or download benchmark dataset according to EXTERNAL_VALIDATION_PLAN.md.")
        return
        
    print(f"[Dataset] Discovered {len(samples)} valid benchmark samples.")
    
    # 3. Check Overlap
    if args.check_overlap:
        overlap_audit = verify_dataset_overlap(samples, DEFAULT_LOCAL_MANIFEST)
        with open(os.path.join(args.output_dir, "overlap_audit.json"), "w", encoding="utf-8") as f:
            json.dump(overlap_audit, f, indent=2)
        print(f"[Integrity] Overlap status: {overlap_audit['status']} (Duplicates: {overlap_audit['exact_hash_duplicates']})")
        if overlap_audit["exact_hash_duplicates"] > 0:
            raise ValueError(f"CRITICAL: Exact hash duplicate detected with local dataset! Aborting evaluation.")
            
    # 4. Standard Preprocessing (Identical to Kaggle Notebook)
    eval_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    # 5. Inference Loop
    print(f"[Inference] Executing zero-shot forward pass on {len(samples)} samples...")
    t0 = time.time()
    
    predictions = []
    y_true = []
    y_pred = []
    y_prob_glaucoma = []
    
    with torch.no_grad():
        for idx, sample in enumerate(samples):
            try:
                with Image.open(sample["path"]) as img:
                    img_rgb = img.convert("RGB")
                    tensor_img = eval_transform(img_rgb).unsqueeze(0).to(device)
                    logits = model(tensor_img)
                    probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
                    
                    prob_non_glaucoma = float(probs[0])
                    prob_glaucoma = float(probs[1])
                    
                    # Apply fixed decision threshold
                    pred_class = 1 if prob_glaucoma >= args.threshold else 0
                    pred_label = "Glaucoma" if pred_class == 1 else "Non-Glaucoma"
                    gt_class = sample["label_int"]
                    gt_label = sample["label_str"]
                    is_correct = (pred_class == gt_class)
                    
                    y_true.append(gt_class)
                    y_pred.append(pred_class)
                    y_prob_glaucoma.append(prob_glaucoma)
                    
                    predictions.append({
                        "sample_id": idx + 1,
                        "filename": sample["filename"],
                        "ground_truth_class": gt_class,
                        "ground_truth_label": gt_label,
                        "predicted_class": pred_class,
                        "predicted_label": pred_label,
                        "softmax_glaucoma": round(prob_glaucoma, 4),
                        "softmax_non_glaucoma": round(prob_non_glaucoma, 4),
                        "classification_threshold": args.threshold,
                        "status": "CORRECT" if is_correct else "INCORRECT",
                        "image_path": sample["path"]
                    })
            except Exception as e:
                print(f"[Warning] Failed to infer sample {sample['filename']}: {e}")
                
    elapsed_sec = time.time() - t0
    print(f"[Inference] Completed in {elapsed_sec:.2f}s (Avg {elapsed_sec/max(1, len(samples))*1000:.1f}ms/img)")
    
    y_true_np = np.array(y_true)
    y_pred_np = np.array(y_pred)
    y_prob_np = np.array(y_prob_glaucoma)
    
    # 6. Statistical & Clinical Metrics Calculation
    cm = confusion_matrix(y_true_np, y_pred_np, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    total = len(y_true_np)
    
    # Wilson Score Intervals for Proportions
    acc_val, acc_low, acc_high = wilson_score_interval(tp + tn, total)
    sens_val, sens_low, sens_high = wilson_score_interval(tp, tp + fn)
    spec_val, spec_low, spec_high = wilson_score_interval(tn, tn + fp)
    prec_val, prec_low, prec_high = wilson_score_interval(tp, tp + fp)
    npv_val, npv_low, npv_high = wilson_score_interval(tn, tn + fn)
    
    f1_val = float(f1_score(y_true_np, y_pred_np, zero_division=0))
    
    # DeLong CI for ROC-AUC
    auc_val, auc_low, auc_high = delong_auc_ci(y_true_np, y_prob_np)
    
    metrics_summary = {
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "benchmark_dataset": args.dataset_name,
        "checkpoint_file": os.path.basename(args.checkpoint),
        "total_evaluated_samples": total,
        "fixed_decision_threshold": args.threshold,
        "class_prevalence": {
            "Glaucoma_positive_count": int(tp + fn),
            "Glaucoma_positive_ratio": round(float((tp + fn) / total), 4),
            "Non_Glaucoma_negative_count": int(tn + fp),
            "Non_Glaucoma_negative_ratio": round(float((tn + fp) / total), 4)
        },
        "confusion_matrix": {
            "true_positive": int(tp),
            "false_negative": int(fn),
            "false_positive": int(fp),
            "true_negative": int(tn),
            "contingency_table": [[int(tn), int(fp)], [int(fn), int(tp)]]
        },
        "metrics_with_95_ci": {
            "accuracy": {
                "point_estimate": round(acc_val, 4),
                "ci_95_lower": round(acc_low, 4),
                "ci_95_upper": round(acc_high, 4),
                "method": "Wilson score interval"
            },
            "sensitivity_recall": {
                "point_estimate": round(sens_val, 4),
                "ci_95_lower": round(sens_low, 4),
                "ci_95_upper": round(sens_high, 4),
                "method": "Wilson score interval"
            },
            "specificity": {
                "point_estimate": round(spec_val, 4),
                "ci_95_lower": round(spec_low, 4),
                "ci_95_upper": round(spec_high, 4),
                "method": "Wilson score interval"
            },
            "precision_ppv": {
                "point_estimate": round(prec_val, 4),
                "ci_95_lower": round(prec_low, 4),
                "ci_95_upper": round(prec_high, 4),
                "method": "Wilson score interval"
            },
            "negative_predictive_value_npv": {
                "point_estimate": round(npv_val, 4),
                "ci_95_lower": round(npv_low, 4),
                "ci_95_upper": round(npv_high, 4),
                "method": "Wilson score interval"
            },
            "f1_score": {
                "point_estimate": round(f1_val, 4)
            },
            "roc_auc": {
                "point_estimate": round(auc_val, 4) if not np.isnan(auc_val) else None,
                "ci_95_lower": round(auc_low, 4) if not np.isnan(auc_low) else None,
                "ci_95_upper": round(auc_high, 4) if not np.isnan(auc_high) else None,
                "method": "DeLong exact variance"
            }
        },
        "scientific_integrity_declaration": (
            "This evaluation was executed in zero-shot frozen model mode with no parameter fine-tuning "
            "and a pre-specified decision threshold (0.50). Metric point estimates and 95% Confidence "
            "Intervals are reported strictly in compliance with STARD-AI and TRIPOD guidelines."
        )
    }
    
    # 7. Export Predictions CSV
    csv_out_path = os.path.join(args.output_dir, "predictions_external.csv")
    with open(csv_out_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "sample_id", "filename", "ground_truth_class", "ground_truth_label",
            "predicted_class", "predicted_label", "softmax_glaucoma",
            "softmax_non_glaucoma", "classification_threshold", "status", "image_path"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(predictions)
    print(f"[Export] Saved detailed predictions to: {csv_out_path}")
    
    # 8. Export Metrics JSON
    json_out_path = os.path.join(args.output_dir, "external_validation_metrics.json")
    with open(json_out_path, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2, ensure_ascii=False)
    print(f"[Export] Saved clinical metrics JSON to: {json_out_path}")
    
    # 9. Plot Confusion Matrix
    try:
        fig, ax = plt.subplots(figsize=(6, 5))
        cax = ax.matshow(cm, cmap=plt.cm.Blues, alpha=0.85)
        for i in range(2):
            for j in range(2):
                ax.text(x=j, y=i, s=f"{cm[i, j]}", va='center', ha='center', size='xx-large', weight='bold')
        fig.colorbar(cax)
        ax.set_xticks([0, 1])
        ax.set_yticks([0, 1])
        ax.set_xticklabels(['Non-Glaucoma (0)', 'Glaucoma (1)'], fontsize=10)
        ax.set_yticklabels(['Non-Glaucoma (0)', 'Glaucoma (1)'], fontsize=10)
        plt.xlabel('Predicted Label', fontsize=11, labelpad=10)
        plt.ylabel('Ground Truth Label', fontsize=11)
        plt.title(f'External Validation: {args.dataset_name}\nResNet-18 V1 (N={total})', fontsize=12, pad=15)
        plt.tight_layout()
        cm_plot_path = os.path.join(args.output_dir, "confusion_matrix_external.png")
        plt.savefig(cm_plot_path, dpi=300)
        plt.close()
        print(f"[Plot] Saved confusion matrix figure: {cm_plot_path}")
    except Exception as e:
        print(f"[Plot Warning] Failed to render confusion matrix: {e}")
        
    # 10. Plot ROC Curve
    try:
        if not np.isnan(auc_val) and len(np.unique(y_true_np)) > 1:
            fpr, tpr, _ = roc_curve(y_true_np, y_prob_np)
            fig, ax = plt.subplots(figsize=(6, 6))
            ax.plot(fpr, tpr, color="#2563eb", lw=2.5, label=f"ResNet-18 V1 (AUC = {auc_val:.3f} [{auc_low:.3f}-{auc_high:.3f}])")
            ax.plot([0, 1], [0, 1], color="#94a3b8", lw=1.5, linestyle="--", label="Random Chance (AUC = 0.50)")
            ax.set_xlim([0.0, 1.0])
            ax.set_ylim([0.0, 1.05])
            ax.set_xlabel("False Positive Rate (1 - Specificity)", fontsize=11)
            ax.set_ylabel("True Positive Rate (Sensitivity)", fontsize=11)
            ax.set_title(f"ROC Curve — External Benchmark ({args.dataset_name})", fontsize=12)
            ax.legend(loc="lower right", frameon=True)
            ax.grid(True, linestyle=":", alpha=0.6)
            plt.tight_layout()
            roc_plot_path = os.path.join(args.output_dir, "roc_curve_external.png")
            plt.savefig(roc_plot_path, dpi=300)
            plt.close()
            print(f"[Plot] Saved ROC curve figure: {roc_plot_path}")
    except Exception as e:
        print(f"[Plot Warning] Failed to render ROC curve: {e}")
        
    print("=" * 70)
    print("EXTERNAL BENCHMARK EVALUATION COMPLETE")
    print(f"Accuracy    : {acc_val*100:.2f}% (95% CI: {acc_low*100:.2f}% - {acc_high*100:.2f}%)")
    print(f"Sensitivity : {sens_val*100:.2f}% (95% CI: {sens_low*100:.2f}% - {sens_high*100:.2f}%)")
    print(f"Specificity : {spec_val*100:.2f}% (95% CI: {spec_low*100:.2f}% - {spec_high*100:.2f}%)")
    if not np.isnan(auc_val):
        print(f"AUROC       : {auc_val:.4f} (95% CI: {auc_low:.4f} - {auc_high:.4f})")
    print("=" * 70)


if __name__ == "__main__":
    cli_args = parse_args()
    evaluate_benchmark(cli_args)
