export default function RoomList({ rooms }) {
  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-2">Rooms</h2>
      <ul className="space-y-1">
        {rooms.map((r, i) => (
          <li key={i} className="p-2 bg-gray-200 rounded">
            {r.type} — {r.size} sqft
          </li>
        ))}
      </ul>
    </div>
  );
}
