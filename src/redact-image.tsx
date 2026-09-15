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
import { readClipboardImage } from "./clipboard-image";
import { getSelectedImagePath } from "./file-selection";
import { validateImage } from "./image-file";
import { openEditor } from "./editor-server";

type FormValues = { image: string[] };

export default function RedactImage() {
  const [isOpening, setIsOpening] = useState(false);

  async function openImage(sourcePath: string, cleanup?: () => Promise<void>) {
    setIsOpening(true);
    try {
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
      if (cleanup) await cleanup().catch(() => undefined);
      setIsOpening(false);
    }
  }

  async function openClipboardImage() {
    try {
      const clipboardImage = await readClipboardImage();
      await openImage(clipboardImage.path, clipboardImage.cleanup);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No clipboard image",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: { image: [] },
    async onSubmit(values) {
      await openImage(values.image[0] ?? "");
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
          <Action
            title="Use Clipboard Image"
            icon={Icon.Clipboard}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "v" },
              Windows: { modifiers: ["ctrl"], key: "v" },
            }}
            onAction={openClipboardImage}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose an image, or press ⌘/Ctrl+V to use one from the clipboard. Export creates a new PNG and never overwrites the source." />
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
