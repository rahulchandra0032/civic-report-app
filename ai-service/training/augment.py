import os
import random
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance


def augment_image(input_path: str, output_dir: str, num_augmentations: int = 5):
    img = Image.open(input_path).convert("RGB")
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    base_name = Path(input_path).stem
    img.save(output_path / f"{base_name}_original.jpg")

    augmentations = [
        ("brightness", lambda im: ImageEnhance.Brightness(im).enhance(random.uniform(0.7, 1.3))),
        ("contrast", lambda im: ImageEnhance.Contrast(im).enhance(random.uniform(0.7, 1.3))),
        ("sharpness", lambda im: ImageEnhance.Sharpness(im).enhance(random.uniform(0.5, 2.0))),
        ("blur", lambda im: im.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 2.0))),
        ("rotate", lambda im: im.rotate(random.uniform(-30, 30), fillcolor=(128, 128, 128))),
        ("flip_h", lambda im: im.transpose(Image.FLIP_LEFT_RIGHT)),
        ("crop", lambda im: im.crop((
            random.randint(0, im.width // 4),
            random.randint(0, im.height // 4),
            im.width - random.randint(0, im.width // 4),
            im.height - random.randint(0, im.height // 4)
        )).resize((im.width, im.height)),
    ]

    for i in range(num_augmentations):
        aug_img = img.copy()
        num_ops = random.randint(1, 3)
        chosen = random.sample(augmentations, min(num_ops, len(augmentations)))

        for name, func in chosen:
            try:
                aug_img = func(aug_img)
            except Exception:
                continue

        aug_img.save(output_dir / f"{base_name}_aug_{i}.jpg", quality=85)


def augment_directory(input_dir: str, output_dir: str, augmentations_per_image: int = 5):
    input_path = Path(input_dir)

    for category_dir in input_path.iterdir():
        if not category_dir.is_dir():
            continue

        cat_output = Path(output_dir) / category_dir.name
        for img_file in category_dir.glob("*.*"):
            if img_file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
                augment_image(str(img_file), str(cat_output), augmentations_per_image)

        count = len(list(cat_output.glob("*")))
        print(f"{category_dir.name}: {count} images after augmentation")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--per-image", type=int, default=5)
    args = parser.parse_args()
    augment_directory(args.input_dir, args.output_dir, args.per_image)
