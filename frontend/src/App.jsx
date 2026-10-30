import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import BoardListPage from "./pages/BoardListPage.jsx";
import BoardDetailPage from "./pages/BoardDetailPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<BoardListPage />} />
        <Route path="boards/:id" element={<BoardDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
