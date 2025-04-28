import Link from "next/link";

export default function Home() {
  return (
    <main className="container mt-5">
      <h1 className="mb-4 text-white">Home Page</h1>
      <Link href="/link-page" className="list-group-item list-group-item-action text-white">
        Переходи в свое пространство
      </Link>
    </main>
  );
}
