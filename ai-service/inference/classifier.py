import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io
import json
from pathlib import Path
from typing import Optional
import numpy as np

CATEGORIES = [
    "pothole",
    "garbage",
    "streetlight",
    "water_leak",
    "drainage",
    "road_damage",
    "construction",
    "other"
]

CATEGORY_DEPARTMENTS = {
    "pothole": "PWD",
    "garbage": "Municipal Corporation",
    "streetlight": "Electrical Department",
    "water_leak": "Water Supply",
    "drainage": "Drainage Board",
    "road_damage": "PWD",
    "construction": "Urban Development",
    "other": "General"
}

CATEGORY_WEIGHTS = {
    "pothole": 20,
    "garbage": 15,
    "streetlight": 12,
    "water_leak": 18,
    "drainage": 16,
    "road_damage": 19,
    "construction": 14,
    "other": 10
}

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])


class IssueClassifier:
    def __init__(self, model_path: Optional[str] = None):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = self._build_model()

        if model_path and Path(model_path).exists():
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.eval()
            print(f"Loaded model from {model_path}")
        else:
            print("Using untrained MobileNetV3 (fine-tune for production)")

    def _build_model(self) -> nn.Module:
        model = models.mobilenet_v3_small(pretrained=True)
        num_features = model.classifier[3].in_features
        model.classifier[3] = nn.Linear(num_features, len(CATEGORIES))
        model.to(self.device)
        model.eval()
        return model

    def preprocess(self, image_bytes: bytes) -> torch.Tensor:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return transform(image).unsqueeze(0).to(self.device)

    @torch.no_grad()
    def classify(self, image_bytes: bytes) -> dict:
        input_tensor = self.preprocess(image_bytes)
        output = self.model(input_tensor)
        probabilities = torch.nn.functional.softmax(output, dim=1)[0]

        top_prob, top_idx = torch.max(probabilities, 0)
        category = CATEGORIES[top_idx.item()]
        confidence = top_prob.item()

        all_probs = {
            CATEGORIES[i]: round(probabilities[i].item(), 4)
            for i in range(len(CATEGORIES))
        }

        return {
            "category": category,
            "confidence": round(confidence, 4),
            "department": CATEGORY_DEPARTMENTS[category],
            "category_weight": CATEGORY_WEIGHTS[category],
            "all_probabilities": all_probs
        }

    def fine_tune(
        self,
        train_dir: str,
        val_dir: str,
        epochs: int = 10,
        lr: float = 0.001,
        output_path: str = "models/classifier.pth"
    ):
        from torch.utils.data import DataLoader
        from torchvision.datasets import ImageFolder

        train_dataset = ImageFolder(train_dir, transform=transform)
        val_dataset = ImageFolder(val_dir, transform=transform)

        train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

        for param in self.model.parameters():
            param.requires_grad = False
        for param in self.model.classifier.parameters():
            param.requires_grad = True

        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.classifier.parameters(), lr=lr)

        best_val_acc = 0.0
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        for epoch in range(epochs):
            self.model.train()
            running_loss = 0.0
            correct = 0
            total = 0

            for images, labels in train_loader:
                images, labels = images.to(self.device), labels.to(self.device)
                optimizer.zero_grad()
                outputs = self.model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                total += labels.size(0)
                correct += (predicted == labels).sum().item()

            train_acc = correct / total

            self.model.eval()
            val_correct = 0
            val_total = 0
            with torch.no_grad():
                for images, labels in val_loader:
                    images, labels = images.to(self.device), labels.to(self.device)
                    outputs = self.model(images)
                    _, predicted = torch.max(outputs, 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()

            val_acc = val_correct / val_total
            print(f"Epoch {epoch+1}/{epochs} - Loss: {running_loss/len(train_loader):.4f} "
                  f"Train Acc: {train_acc:.4f} Val Acc: {val_acc:.4f}")

            if val_acc > best_val_acc:
                best_val_acc = val_acc
                torch.save(self.model.state_dict(), output_path)
                print(f"  Saved best model (val_acc: {val_acc:.4f})")

        print(f"\nTraining complete. Best val accuracy: {best_val_acc:.4f}")
