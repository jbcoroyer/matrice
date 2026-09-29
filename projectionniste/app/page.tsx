import { redirect } from "next/navigation";

// L'accueil, c'est Découvrir.
export default function Page() {
  redirect("/decouvrir");
}
