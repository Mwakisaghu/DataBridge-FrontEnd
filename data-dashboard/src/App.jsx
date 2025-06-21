import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "antd";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Validations from "./pages/Validations";
import Logs from "./pages/Logs";

const { Content, Footer } = Layout;

const App = () => {
  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        <Sidebar /> {/* Sidebar Navigation */}
        
        <Layout style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Content style={{ flex: 1, padding: "20px", overflow: "auto" }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/validations" element={<Validations />} />
              <Route path="/logs" element={<Logs />} />
            </Routes>
          </Content>

          <Footer style={{ textAlign: "center", background: "#f0f2f5", padding: "10px" }}>
            © {new Date().getFullYear()} hmc . All Rights Reserved.
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
