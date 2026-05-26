// Top-level app component.
// TODO: wire SearchBar -> ResultsList -> SkillDetail.

import SearchBar from "./components/SearchBar.jsx";
import ResultsList from "./components/ResultsList.jsx";
import SkillDetail from "./components/SkillDetail.jsx";

export default function App() {
  return (
    <div>
      <h1>The Lore</h1>
      {/* TODO: state for query, results, selectedSkill */}
      <SearchBar />
      <ResultsList />
      <SkillDetail />
    </div>
  );
}
