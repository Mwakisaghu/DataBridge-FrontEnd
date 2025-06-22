import { useState } from "react";
import {
  Upload,
  Button,
  Card,
  Table,
  Typography,
  message,
  Spin,
  Progress,
  Switch,
  Select,
} from "antd";
import {
  InboxOutlined,
  FileExcelOutlined,
  CloseCircleOutlined,
  BulbOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Validations = () => {
  const [fileData, setFileData] = useState([]);
  const [fileName, setFileName] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [dataType, setDataType] = useState("members");

  // Handle File Upload
  const handleUpload = (info) => {
    const file = info.file.originFileObj || info.file;
    if (!file) {
      message.error("No file detected. Please try again.");
      return;
    }

    setFileName(file.name);
    setOriginalFile(file);
    setLoading(true);
    setProgress(20);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        setProgress(50);
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        setProgress(80);
        if (sheetData.length === 0) {
          message.warning("The uploaded file is empty.");
          setFileData([]);
          setProgress(100);
          return;
        }

        const headers = sheetData[0];
        const rows = sheetData.slice(1).map((row, index) => {
          let rowData = { key: index };
          headers.forEach((header, i) => (rowData[header] = row[i] || ""));
          return rowData;
        });

        setFileData(rows);
        message.success(`${file.name} uploaded successfully!`);
        setProgress(100);
      } catch (error) {
        message.error("Invalid file format. Please upload a valid Excel file.");
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Validate File with Backend
  const validateFile = async () => {
    if (!originalFile || fileData.length === 0) {
      message.warning("Please upload a valid Excel file first.");
      return;
    }

    setLoading(true);
    setProgress(30);
    setValidationResults(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const endpoint = `http://localhost:8081/validate/${dataType}`;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: e.target.result,
        });

        const result = await response.json();
        setProgress(100);

        if (result.status === "success") {
          message.success(result.message);
        } else {
          message.error(result.message || "Validation failed.");
          setValidationResults(result.errors || {});
        }
      } catch (err) {
        message.error("Error validating file.");
        console.error(err);
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    };

    reader.readAsArrayBuffer(originalFile);
  };

  // Clear File & Data
  const handleClear = () => {
    setFileData([]);
    setFileName(null);
    setOriginalFile(null);
    setValidationResults(null);
    setProgress(0);
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: darkMode ? "#1e1e1e" : "#fff",
        color: darkMode ? "#fff" : "#000",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2} style={{ margin: 0 }}>Data Validations</Title>
        <Switch
          checkedChildren={<BulbOutlined />}
          unCheckedChildren={<BulbOutlined />}
          onChange={() => setDarkMode(!darkMode)}
        />
      </div>

      <Card style={{ marginTop: "20px", backgroundColor: darkMode ? "#333" : "#fff" }}>
        <Dragger
          accept=".csv, .xls, .xlsx"
          showUploadList={false}
          beforeUpload={(file) => {
            handleUpload({ file });
            return false;
          }}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drag a CSV/Excel file to upload</p>
        </Dragger>
        {progress > 0 && <Progress percent={progress} status={loading ? "active" : "normal"} />}
      </Card>

      {fileName && (
        <Card
          title={`Uploaded File: ${fileName}`}
          style={{ marginTop: "20px", backgroundColor: darkMode ? "#333" : "#fff" }}
        >
          {loading ? (
            <Spin tip="Processing file..." size="large" />
          ) : (
            <>
              <Text strong>Total Rows: {fileData.length}</Text>

              {/* 👇 Data Type Selector Added Here */}
              <div style={{ margin: "20px 0" }}>
                <Text>Select Validation Type:</Text>
                <Select
                  style={{ width: 300, marginLeft: 10 }}
                  value={dataType}
                  onChange={(value) => setDataType(value)}
                  options={[
                    { label: "Members", value: "members" },
                    { label: "Chart of Accounts", value: "chart-of-accounts" },
                    // Add more here if needed
                  ]}
                />
              </div>

              <div style={{ maxHeight: "400px", overflow: "auto", border: "1px solid #ddd", padding: "10px" }}>
                <Table
                  dataSource={fileData}
                  columns={Object.keys(fileData[0] || {}).map((col) => ({
                    title: col,
                    dataIndex: col,
                    key: col,
                  }))}
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: true }}
                />
              </div>
              <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
                <Button
                  type="primary"
                  icon={<FileExcelOutlined />}
                  onClick={validateFile}
                >
                  Validate Data
                </Button>
                <Button
                  type="default"
                  icon={<CloseCircleOutlined />}
                  danger
                  onClick={handleClear}
                >
                  Clear File
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {validationResults && (
        <Card
          title="Validation Errors"
          style={{
            marginTop: "20px",
            backgroundColor: darkMode ? "#444" : "#fafafa",
          }}
        >
          <ul>
            {Object.entries(validationResults).map(([row, errors]) => (
              <li key={row}>
                <strong>Row {row}:</strong> {errors.join(", ")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default Validations;