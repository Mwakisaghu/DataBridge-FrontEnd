import { useState } from "react";
import { Card, Table, Tag, Typography, Button, Switch, Select } from "antd";
import { DeleteOutlined, BulbOutlined, FilterOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

const Logs = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState([
    { key: 1, level: "info", message: "User logged in", timestamp: "2025-03-21 10:00:00" },
    { key: 2, level: "error", message: "Failed to fetch data", timestamp: "2025-03-21 10:05:00" },
    { key: 3, level: "warning", message: "Password attempt limit reached", timestamp: "2025-03-21 10:10:00" },
    { key: 4, level: "info", message: "Data export successful", timestamp: "2025-03-21 10:15:00" },
  ]);

  const logColors = {
    info: "blue",
    error: "red",
    warning: "orange",
  };

  const filteredLogs = filter === "all" ? logs : logs.filter(log => log.level === filter);

  const handleClearLogs = () => setLogs([]);

  return (
    <div style={{ padding: "20px", backgroundColor: darkMode ? "#1e1e1e" : "#fff", color: darkMode ? "#fff" : "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>System Logs</Title>
        <Switch checkedChildren={<BulbOutlined />} unCheckedChildren={<BulbOutlined />} onChange={() => setDarkMode(!darkMode)} />
      </div>

      <Card style={{ marginTop: "20px", backgroundColor: darkMode ? "#333" : "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <Select value={filter} onChange={setFilter} style={{ width: 150 }}>
            <Option value="all">All Logs</Option>
            <Option value="info">Info</Option>
            <Option value="error">Error</Option>
            <Option value="warning">Warning</Option>
          </Select>
          <Button type="danger" icon={<DeleteOutlined />} onClick={handleClearLogs} disabled={logs.length === 0}>Clear Logs</Button>
        </div>

        <div style={{ maxHeight: "400px", overflow: "auto" }}>
          <Table
            dataSource={filteredLogs}
            columns={[
              {
                title: "Timestamp",
                dataIndex: "timestamp",
                key: "timestamp",
              },
              {
                title: "Level",
                dataIndex: "level",
                key: "level",
                render: level => <Tag color={logColors[level]}>{level.toUpperCase()}</Tag>,
              },
              {
                title: "Message",
                dataIndex: "message",
                key: "message",
              },
            ]}
            pagination={false}
          />
        </div>
      </Card>
    </div>
  );
};

export default Logs;
