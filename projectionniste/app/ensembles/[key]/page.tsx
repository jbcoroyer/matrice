import { SetView } from "@/components/SetView";

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <SetView setKey={key} />;
}
