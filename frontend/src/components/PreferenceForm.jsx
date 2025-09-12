import React, { useState } from "react";

export default function PreferenceForm() {
  const [form, setForm] = useState({ style: "", mood: "" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    alert(`Preferences submitted: ${JSON.stringify(form)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        name="style"
        placeholder="Preferred Style (e.g. Modern)"
        value={form.style}
        onChange={handleChange}
        className="border p-2 w-full rounded"
      />
      <input
        name="mood"
        placeholder="Mood (e.g. Cozy, Elegant)"
        value={form.mood}
        onChange={handleChange}
        className="border p-2 w-full rounded"
      />
      <button className="px-4 py-2 bg-green-600 text-white rounded">Save</button>
    </form>
  );
}
