import type { FormValues } from "./validation";

export type FormField = keyof FormValues;

export type ActionState = {
  error: string;
  status: "INITIAL" | "SUCCESS" | "ERROR";
  _id?: string;
  fieldErrors?: Partial<Record<FormField, string[]>>;
};

export const initialActionState: ActionState = {
  error: "",
  status: "INITIAL",
};
