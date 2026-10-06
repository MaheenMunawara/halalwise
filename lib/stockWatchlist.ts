import clientPromise from "@/lib/mongodb";

export type StockWatchlistDocument = {
  userId: string;
  symbol: string;
  companyName: string;
  createdAt: Date;
};

export async function getStockWatchlistCollection() {
  const client = await clientPromise;

  const db = client.db("halalwise");

  return db.collection<StockWatchlistDocument>(
    "stockWatchlist"
  );
}