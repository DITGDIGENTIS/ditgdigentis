import Link from "next/link";

export default function Home() {
  return (
    <main className="container mt-5">
      <h1 className="mb-4 text-white">Home Page</h1>
      <div className="list-group">
        <Link 
          href="/furniset" 
          className="list-group-item list-group-item-action"
        >
          Furniset
        </Link>
        <Link 
          href="/green-house" 
          className="list-group-item list-group-item-action"
        >
          Green House
        </Link>
        <Link 
          href="/test" 
          className="list-group-item list-group-item-action"
        >
          Test
        </Link>
      </div>
    </main>
  );
}
