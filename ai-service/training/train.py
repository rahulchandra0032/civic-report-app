import os
import sys
import json
import argparse
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from inference.classifier import IssueClassifier, CATEGORIES


def prepare_dataset(source_dir: str, output_dir: str, split: float = 0.8):
    from PIL import Image
    import random

    output_path = Path(output_dir)
    train_path = output_path / "train"
    val_path = output_path / "val"

    for category in CATEGORIES:
        (train_path / category).mkdir(parents=True, exist_ok=True)
        (val_path / category).mkdir(parents=True, exist_ok=True)

    for category in CATEGORIES:
        cat_dir = Path(source_dir) / category
        if not cat_dir.exists():
            print(f"Warning: {cat_dir} not found, skipping")
            continue

        images = list(cat_dir.glob("*.jpg")) + list(cat_dir.glob("*.png")) + list(cat_dir.glob("*.jpeg"))
        random.shuffle(images)

        split_idx = int(len(images) * split)
        train_images = images[:split_idx]
        val_images = images[split_idx:]

        for img in train_images:
            dest = train_path / category / img.name
            Image.open(img).save(dest)

        for img in val_images:
            dest = val_path / category / img.name
            Image.open(img).save(dest)

        print(f"{category}: {len(train_images)} train, {len(val_images)} val")

    print(f"\nDataset prepared at {output_dir}")


def train_model(train_dir: str, val_dir: str, epochs: int = 10, output: str = "models/classifier.pth"):
    classifier = IssueClassifier()
    classifier.fine_tune(train_dir, val_dir, epochs=epochs, output_path=output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train civic issue classifier")
    parser.add_argument("command", choices=["prepare", "train", "full"])
    parser.add_argument("--source-dir", default="training/dataset/raw")
    parser.add_argument("--output-dir", default="training/dataset/processed")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--model-output", default="models/classifier.pth")
    args = parser.parse_args()

    if args.command == "prepare":
        prepare_dataset(args.source_dir, args.output_dir)
    elif args.command == "train":
        train_model(
            f"{args.output_dir}/train",
            f"{args.output_dir}/val",
            epochs=args.epochs,
            output=args.model_output
        )
    elif args.command == "full":
        prepare_dataset(args.source_dir, args.output_dir)
        train_model(
            f"{args.output_dir}/train",
            f"{args.output_dir}/val",
            epochs=args.epochs,
            output=args.model_output
        )
