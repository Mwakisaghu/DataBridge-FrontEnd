import { useState } from "react";
import { Card, Statistic, Table, DatePicker, Button, Space, Typography } from "antd";
import { BarChartOutlined, FileExcelOutlined, FilePdfOutlined } from "@ant-design/icons";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import moment from "moment";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// Sample Data
const reportData = [
  { id: 1, name: "Migration A", type: "Full Migration", success: 120, failed: 10, date: "2024-03-10" },
  { id: 2, name: "Migration B", type: "Single Table", success: 90, failed: 15, date: "2024-03-11" },
  { id: 3, name: "Migration C", type: "Update Table", success: 80, failed: 20, date: "2024-03-12" },
];

const Reports = () => {
  const [filteredData, setFilteredData] = useState(reportData);
  const [dateRange, setDateRange] = useState(null);

  // Handle Date Filtering
  const handleDateChange = (dates) => {
    setDateRange(dates);
    if (dates) {
      const [start, end] = dates;
      const filtered = reportData.filter((item) => 
        moment(item.date).isBetween(start, end, "day", "[]")
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(reportData);
    }
  };

  return (
<div style={{ padding: "20px", marginTop: 0 }}>
<Title level={2} style={{ margin: 0 }}>Reports & Analytics</Title>

      {/* Report Summary Cards */}
      <Space style={{ display: "flex", marginBottom: "20px" }}>
        <Card>
          <Statistic title="Total Migrations" value={filteredData.length} prefix={<BarChartOutlined />} />
        </Card>
        <Card>
          <Statistic title="Successful Migrations" value={filteredData.reduce((sum, item) => sum + item.success, 0)} />
        </Card>
        <Card>
          <Statistic title="Failed Migrations" value={filteredData.reduce((sum, item) => sum + item.failed, 0)} />
        </Card>
      </Space>

      {/* Chart */}
      <Card title="Migration Success & Failure Trends" style={{ marginBottom: "20px" }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="success" fill="#52c41a" name="Successful" />
            <Bar dataKey="failed" fill="#ff4d4f" name="Failed" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Filters */}
      <Space style={{ marginBottom: "20px" }}>
        <RangePicker onChange={handleDateChange} />
        <Button icon={<FileExcelOutlined />} type="primary">
          Export as Excel
        </Button>
        <Button icon={<FilePdfOutlined />} type="default">
          Export as PDF
        </Button>
      </Space>

      {/* Data Table */}
      <Card title="Detailed Reports">
        <Table
          dataSource={filteredData}
          columns={[
            { title: "Migration Name", dataIndex: "name", key: "name" },
            { title: "Type", dataIndex: "type", key: "type" },
            { title: "Successful", dataIndex: "success", key: "success", sorter: (a, b) => a.success - b.success },
            { title: "Failed", dataIndex: "failed", key: "failed", sorter: (a, b) => a.failed - b.failed },
            { title: "Date", dataIndex: "date", key: "date" },
          ]}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default Reports;
