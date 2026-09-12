from sqlalchemy import Column, String, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ward_number = Column(Integer, nullable=False)
    district = Column(String(100), nullable=False)
    state = Column(String(50), default="Jharkhand", nullable=False)
    officer_id = Column(String(36), nullable=True)
    boundary = Column(Text, nullable=True)

    issues = relationship("Issue", back_populates="ward", foreign_keys="Issue.ward_id")
