// TODO (keyingi promt): test boshlash/davom ettirish, savol/variantlar tasodifiylashtirish,
// jon (hearts) mantig'i, "jarayonda" / "tugallangan" holatlari.

export default function StudentTestPage({ params }) {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Test — mavzu: {params.mavzuId}</h1>
    </main>
  );
}
