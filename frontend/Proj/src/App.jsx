import React from "react";
import Register from "./Register/register"; // make sure tama ang path
import Login from "./Login/Login";
import Navbar from "./Components/Navbar/Navbar";

function App() {
  return (
    <div>
      <Navbar/>
      <Login/>
    </div>
  );
}

export default App;
