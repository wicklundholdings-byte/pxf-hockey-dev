import type { Category } from "./pxf";

export const trainingCategories = [
  { name: "Slip Circuits", tint: "teal" as const },
  { name: "GameIQ Circuits", tint: "volt" as const },
  { name: "Skating Flow", tint: "teal" as const },
  { name: "Edge Control", tint: "volt" as const },
  { name: "Dryland Skills", tint: "teal" as const },
  { name: "Dryland Training", tint: "volt" as const },
] as const;

export type TrainingCategory = (typeof trainingCategories)[number]["name"];

export const TRAINING_CATEGORY_TO_DRILL_CATEGORIES: Record<TrainingCategory, Category[]> = {
  "Slip Circuits": ["Circuits"],
  "GameIQ Circuits": ["GameIQ"],
  "Skating Flow": ["Skating Flow"],
  "Edge Control": ["Edge Control"],
  "Dryland Skills": [],
  "Dryland Training": [],
};
