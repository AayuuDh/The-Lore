// We are removing the left panel for now, just keeping it for reference.

// import React from "react";
// import { PersonIcon } from "@primer/octicons-react";
// import "./LeftPanel.css";

// const TOP_SKILLS = [
//   { name: "Skill 1", color: "#3fb950" },
//   { name: "Skill 2", color: "#1f6feb" },
//   { name: "Skill 3", color: "#8957e5" },
//   { name: "Skill 4", color: "#d29922" },
// ];

// const TOP_PROJECTS = [
//   { name: "Project 1", color: "#3fb950" },
//   { name: "Project 2", color: "#1f6feb" },
//   { name: "Project 3", color: "#d29922" },
// ];

// function LeftPanel() {
//   return (
//     <div className="left-panel">
//       {/* User info */}
//       <div className="left-panel__user">
//         <div className="left-panel__avatar">
//           <PersonIcon size={20} />
//         </div>
//         <div>
//           <div className="left-panel__username">user-xyz</div>
//           <div className="left-panel__subtitle">Your dashboard</div>
//         </div>
//       </div>

//       {/* Top Skills */}
//       <div className="left-panel__section">
//         <h3 className="left-panel__section-title">Top Skills</h3>
//         <ul className="left-panel__list">
//           {TOP_SKILLS.map((s) => (
//             <li key={s.name} className="left-panel__list-item">
//               <span
//                 className="left-panel__dot"
//                 style={{ backgroundColor: s.color }}
//               />
//               <span>{s.name}</span>
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Top Projects */}
//       <div className="left-panel__section">
//         <h3 className="left-panel__section-title">Top Projects</h3>
//         <ul className="left-panel__list">
//           {TOP_PROJECTS.map((p) => (
//             <li key={p.name} className="left-panel__list-item">
//               <span
//                 className="left-panel__dot"
//                 style={{ backgroundColor: p.color }}
//               />
//               <span>{p.name}</span>
//             </li>
//           ))}
//         </ul>
//       </div>
//     </div>
//   );
// }

// export default LeftPanel;