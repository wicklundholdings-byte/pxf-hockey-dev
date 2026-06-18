import type { Category } from "./pxf";

export const trainingCategories = [
  { name: "Slip Circuits", tint: "teal" as const, comingSoon: false },
  { name: "Dryland Skills", tint: "volt" as const, comingSoon: false },
  { name: "Game IQ Circuits", tint: "teal" as const, comingSoon: true },
] as const;

export type TrainingCategory = (typeof trainingCategories)[number]["name"];

export const TRAINING_CATEGORY_TO_DRILL_CATEGORIES: Record<TrainingCategory, Category[]> = {
  "Slip Circuits": ["Circuits"],
  "Dryland Skills": [],
  "Game IQ Circuits": ["GameIQ"],
};
