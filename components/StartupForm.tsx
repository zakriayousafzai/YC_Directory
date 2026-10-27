"use client";

import { useActionState, useState } from "react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import MDEditor from "@uiw/react-md-editor";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createPitch } from "@/lib/action";
import {
  initialActionState,
  type ActionState,
} from "@/lib/action-state";

const StartupForm = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pitch, setPitch] = useState("");

  const handleFormSubmit = async (
    prevState: ActionState,
    formData: FormData
  ): Promise<ActionState> => {
    try {
      const result = await createPitch(prevState, formData);

      if (result.status === "SUCCESS") {
        setErrors({});

        toast({
          title: "Success",
          description: "Your startup pitch has been created successfully",
        });

        if (result._id) {
          router.push(`/startup/${result._id}`);
        }

        return result;
      }

      if (result.fieldErrors) {
        const nextErrors: Record<string, string> = {};

        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            nextErrors[field] = messages[0];
          }
        }

        setErrors(nextErrors);
      }

      toast({
        title: "Error",
        description:
          result.error || "Please check your inputs and try again",
        variant: "destructive",
      });

      return result;
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error has occurred",
        variant: "destructive",
      });

      return {
        ...prevState,
        error: "An unexpected error has occurred",
        status: "ERROR",
      };
    }
  };

  const [state, formAction, isPending] = useActionState(
    handleFormSubmit,
    initialActionState
  );

  return (
    <form action={formAction} className="startup-form">
      <div>
        <label htmlFor="title" className="startup-form_label">
          Title
        </label>
        <Input
          id="title"
          name="title"
          className="startup-form_input"
          required
          placeholder="Startup Title"
        />

        {errors.title && <p className="startup-form_error">{errors.title}</p>}
      </div>

      <div>
        <label htmlFor="description" className="startup-form_label">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          className="startup-form_textarea"
          required
          placeholder="Startup Description"
        />

        {errors.description && (
          <p className="startup-form_error">{errors.description}</p>
        )}
      </div>

      <div>
        <label htmlFor="category" className="startup-form_label">
          Category
        </label>
        <Input
          id="category"
          name="category"
          className="startup-form_input"
          required
          placeholder="Startup Category (Tech, Health, Education, etc)"
        />

        {errors.category && (
          <p className="startup-form_error">{errors.category}</p>
        )}
      </div>

      <div>
        <label htmlFor="link" className="startup-form_label">
          Image URL
        </label>
        <Input
          id="link"
          name="link"
          className="startup-form_input"
          required
          placeholder="Startup Image URL"
        />

        {errors.link && <p className="startup-form_error">{errors.link}</p>}
      </div>

      <div data-color-mode="light">
        <label htmlFor="pitch" className="startup-form_label">
          Pitch
        </label>
        <MDEditor
          value={pitch}
          onChange={(value) => setPitch(value ?? "")}
          id="pitch"
          preview="edit"
          height={300}
          style={{ borderRadius: 20, overflow: "hidden" }}
          textareaProps={{
            placeholder: "Briefly describe your idea and what it solves.",
          }}
          previewOptions={{
            disallowedElements: ["style"],
          }}
        />
        <input type="hidden" name="pitch" value={pitch} />

        {errors.pitch && <p className="startup-form_error">{errors.pitch}</p>}
      </div>

      {state.error && <p className="startup-form_error">{state.error}</p>}

      <Button
        type="submit"
        className="startup-form_btn text-white"
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Submit"}
        <Send className="size-6 ml-2" />
      </Button>
    </form>
  );
};

export default StartupForm;
