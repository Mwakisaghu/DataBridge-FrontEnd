import { useEffect, useState } from "react";
import { Card, Table, Tag, Typography, Button, Switch, Select, message } from "antd";
import { DeleteOutlined, BulbOutlined, ReloadOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title } = Typography;
const { Option } = Select;

const Logs = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [filter, setFilter] = useState("all");
  const [logs, setLogs] = useState([]);

  const logColors = {
    info: "blue",
    error: "red",
    warning: "orange",
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get("http://localhost:8081/logs");
      const data = res.data.map((log, index) => ({
        key: index + 1,
        ...log,
      }));
      setLogs(data);
    } catch (err) {
      message.error("Failed to fetch logs");
      console.error(err);
    }
  };

  const clearLogs = async () => {
    try {
      await axios.post("http://localhost:8081/logs/clear");
      setLogs([]);
      message.success("Logs cleared");
    } catch (err) {
      message.error("Failed to clear logs");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = filter === "all" ? logs : logs.filter(log => log.level === filter);

  return (
    <div style={{ padding: "20px", backgroundColor: darkMode ? "#1e1e1e" : "#fff", color: darkMode ? "#fff" : "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>System Logs</Title>
        <Switch
          checkedChildren={<BulbOutlined />}
          unCheckedChildren={<BulbOutlined />}
          onChange={() => setDarkMode(!darkMode)}
        />
      </div>

      <Card style={{ marginTop: "20px", backgroundColor: darkMode ? "#333" : "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <Select value={filter} onChange={setFilter} style={{ width: 150 }}>
              <Option value="all">All Logs</Option>
              <Option value="info">Info</Option>
              <Option value="error">Error</Option>
              <Option value="warning">Warning</Option>
            </Select>
            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Refresh</Button>
          </div>
          <Button
            type="danger"
            icon={<DeleteOutlined />}
            onClick={clearLogs}
            disabled={logs.length === 0}
          >
            Clear Logs
          </Button>
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
                render: level => <Tag color={logColors[level] || "gray"}>{level.toUpperCase()}</Tag>,
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
