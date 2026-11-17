import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Gallery } from "./Gallery";

export const metadata: Metadata = { title: "Components · Kudi Log", robots: { index: false } };

/** Component gallery for development. Not part of the shipped app. */
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Gallery />;
}
