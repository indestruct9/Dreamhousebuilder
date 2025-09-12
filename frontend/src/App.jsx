import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import PreferenceForm from "./pages/PreferenceForm";

function App() {
  const [page, setPage] = useState("dashboard");
  const [currentProject, setCurrentProject] = useState(null);

  return (
    <div className="p-4">
      {page === "dashboard" && (
        <Dashboard
          onOpen={(proj) => {
            setCurrentProject(proj);
            setPage("editor");
          }}
          onNew={() => setPage("preferences")}
        />
      )}

      {page === "preferences" && (
        <PreferenceForm
          onBack={() => setPage("dashboard")}
          onNext={(layout) => {
            setCurrentProject(layout);
            setPage("editor");
          }}
        />
      )}

      {page === "editor" && (
        <Editor layout={currentProject} onBack={() => setPage("dashboard")} />
      )}
    </div>
  );
}

export default App;
