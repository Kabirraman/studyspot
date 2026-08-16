"use client";

import { useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";

type Props = {
  spotId: string;
  onUploaded?: () => void;
};

// Uploads straight from the browser to Cloudinary using an *unsigned*
// upload preset — no server-side API secret needed, which keeps this on
// Cloudinary's free tier with zero backend key management. Set both env
// vars in .env (see README for how to create the preset), then this
// route just records the resulting URL in Postgres via /api/spots/:id/photos.
export default function PhotoUpload({ spotId, onUploaded }: Props) {
  const { data: session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  async function handleFile(file: File) {
    if (!cloudName || !uploadPreset) {
      setStatus("error");
      console.error(
        "Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env"
      );
      return;
    }

    setStatus("uploading");
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", uploadPreset);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: form }
      );
      if (!uploadRes.ok) throw new Error("Cloudinary upload failed");
      const uploaded = await uploadRes.json();

      const saveRes = await fetch(`/api/spots/${spotId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploaded.secure_url }),
      });
      if (!saveRes.ok) throw new Error("Saving photo record failed");

      setStatus("idle");
      setPreview(null);
      onUploaded?.();
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="text-xs text-neutral-500 underline hover:text-neutral-300"
      >
        Sign in to add a photo
      </button>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={status === "uploading"}
        className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 disabled:opacity-50"
      >
        {status === "uploading" ? "Uploading…" : "Add a photo"}
      </button>

      {status === "error" && (
        <p className="mt-2 text-xs text-red-400">
          Upload failed — check your Cloudinary env vars are set correctly.
        </p>
      )}

      {preview && status === "uploading" && (
        <img src={preview} alt="Uploading preview" className="mt-2 h-20 w-20 rounded-lg object-cover opacity-60" />
      )}
    </div>
  );
}
