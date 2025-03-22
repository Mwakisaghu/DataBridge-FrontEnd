import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "antd";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

const { Sider, Content, Footer } = Layout;

const App = () => {
  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Sidebar */}
        <Sider width={250}>
          <Sidebar />
        </Sider>

        {/* Main Layout */}
        <Layout style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          {/* Content should take up remaining space */}
          <Content style={{ flex: 1, padding: "20px", overflow: "auto" }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
            </Routes>
          </Content>

          {/* Footer remains fixed at the bottom */}
          <Footer style={{ textAlign: "center", background: "#f0f2f5", padding: "10px" }}>
            © {new Date().getFullYear()} DataBridge . All Rights Reserved.
          </Footer>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;