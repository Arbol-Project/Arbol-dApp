// import { PageHeader, Image, AutoComplete } from "antd";
import React from "react";

// displays a page header

// function logo() {
//   return (
//     <a href="https://www.arbolmarket.com/" target="_blank" rel="noopener noreferrer">
//       <img
//         width={100}
//         src="/logo.png"
//         alt="Logo" 
//       />
//     </a>
//   );
// }

export default function Header() {
  return (
      // <PageHeader
      //   style={{ backgroundColor: "#FFFFFF" }}
      //   title={
      //     <a href="https://www.arbolmarket.com/" target="_blank" rel="noopener noreferrer">
      //       <img
      //         width={100}
      //         src="/logo.png"
      //         alt="Logo" 
      //       />
      //     </a>
      //   }
      //   // style={{ cursor: "pointer" }}
      // />
  <div style={{ textAlign: "left" }}>
    <a href="https://www.arbolunderwriters.com/" target="_blank" rel="noopener noreferrer">
      <img
        width={100}
        src="/logo.png"
        alt="Logo" 
      />
    </a>
  </div>
  );
}
