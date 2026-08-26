import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { getSelectedImagePath } from "./file-selection";
import { validateImage } from "./image-file";
import { openEditor } from "./editor-server";

type FormValues = { image: string[] };

export default function RedactImage() {
  const [isOpening, setIsOpening] = useState(false);
  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { image: [] },
    async onSubmit(values) {
      setIsOpening(true);
      try {
        const sourcePath = values.image[0] ?? "";
        const mimeType = await validateImage(sourcePath);
        await showToast({
          style: Toast.Style.Animated,
          title: "Opening private editor…",
        });
        await openEditor(sourcePath, mimeType);
        await showToast({
          style: Toast.Style.Success,
          title: "Image loaded",
          message: "The original will not be changed.",
        });
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not open image",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsOpening(false);
      }
    },
    validation: {
      image(value) {
        if (!value?.length) return "Choose an image.";
      },
    },
  });

  useEffect(() => {
    let active = true;
    void getSelectedImagePath().then((path) => {
      if (active && path) setValue("image", [path]);
    });
    return () => {
      active = false;
    };
  }, [setValue]);

  return (
    <Form
      isLoading={isOpening}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Open Redaction Canvas"
            icon={Icon.EyeDisabled}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="The editor runs privately on this computer. Export creates a new PNG and never overwrites the source." />
      <Form.FilePicker
        {...itemProps.image}
        title="Image"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}
