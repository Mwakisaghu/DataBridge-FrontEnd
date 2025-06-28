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
  Radio,
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
  const [validationMode, setValidationMode] = useState("single");

  // Cross-validation states
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [fileDataA, setFileDataA] = useState([]);
  const [fileDataB, setFileDataB] = useState([]);

  const handleUpload = (info) => {
    const file = info.file.originFileObj || info.file;
    if (!file) {
      message.error("No file detected. Please try again.");
      return;
    }
    setFileName(file.name);
    setOriginalFile(file);
    parseExcel(file, setFileData);
  };

  const handleUploadA = (info) => {
    const file = info.file.originFileObj || info.file;
    if (!file) return;
    setFileA(file);
    parseExcel(file, setFileDataA);
  };

  const handleUploadB = (info) => {
    const file = info.file.originFileObj || info.file;
    if (!file) return;
    setFileB(file);
    parseExcel(file, setFileDataB);
  };

  const parseExcel = (file, setDataCallback) => {
    setLoading(true);
    setProgress(30);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (sheetData.length === 0) {
          message.warning("The uploaded file is empty.");
          setDataCallback([]);
          return;
        }

        const headers = sheetData[0];
        const rows = sheetData.slice(1).map((row, index) => {
          const rowData = { key: index };
          headers.forEach((header, i) => (rowData[header] = row[i] || ""));
          return rowData;
        });

        setDataCallback(rows);
        message.success(`${file.name} uploaded successfully!`);
        setProgress(100);
      } catch (err) {
        message.error("Failed to parse file.");
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleValidate = async () => {
    if (validationMode === "single") {
      if (!originalFile || fileData.length === 0) {
        message.warning("Please upload a valid Excel file first.");
        return;
      }

      setLoading(true);
      setProgress(40);
      setValidationResults(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const endpoint = `http://localhost:8081/validate/${dataType}`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
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
        } finally {
          setLoading(false);
          setTimeout(() => setProgress(0), 1000);
        }
      };

      reader.readAsArrayBuffer(originalFile);
    } else {
      // Cross-validation
      if (!fileA || !fileB) {
        message.warning("Please upload both File A and File B.");
        return;
      }

      setLoading(true);
      setProgress(30);
      setValidationResults(null);

      try {
        const formData = new FormData();
        formData.append("fileA", fileA);
        formData.append("fileB", fileB);

        const response = await fetch(`http://localhost:8081/validate-cross/${dataType}`, {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        setProgress(100);

        if (result.status === "success") {
          message.success(result.message);
        } else {
          message.error(result.message || "Cross-validation failed.");
          setValidationResults(result.errors || {});
        }
      } catch (err) {
        message.error("Error during cross-validation.");
      } finally {
        setLoading(false);
        setTimeout(() => setProgress(0), 1000);
      }
    }
  };

  const handleClear = () => {
    setFileName(null);
    setFileData([]);
    setOriginalFile(null);
    setValidationResults(null);
    setFileA(null);
    setFileB(null);
    setFileDataA([]);
    setFileDataB([]);
    setProgress(0);
  };

  return (
    <div style={{ padding: 20, backgroundColor: darkMode ? "#1e1e1e" : "#fff", color: darkMode ? "#fff" : "#000" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={2}>Data Validations</Title>
        <Switch checkedChildren={<BulbOutlined />} unCheckedChildren={<BulbOutlined />} onChange={() => setDarkMode(!darkMode)} />
      </div>

      <Card style={{ marginTop: 20, backgroundColor: darkMode ? "#333" : "#fff" }}>
        <Text>Validation Mode:</Text>
        <Radio.Group
          value={validationMode}
          onChange={(e) => {
            setValidationMode(e.target.value);
            handleClear();
          }}
          style={{ marginLeft: 10 }}
        >
          <Radio value="single">Single Validation</Radio>
          <Radio value="cross">Cross Validation</Radio>
        </Radio.Group>
      </Card>

      {validationMode === "single" && !originalFile && (
        <Card style={{ marginTop: 20, backgroundColor: darkMode ? "#333" : "#fff" }}>
          <Dragger
            accept=".csv, .xls, .xlsx"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUpload({ file });
              return false;
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Click or drag a file to upload for validation</p>
          </Dragger>
          {progress > 0 && <Progress percent={progress} status={loading ? "active" : "normal"} />}
        </Card>
      )}

      {validationMode === "cross" && !fileA && (
        <Card title="Upload File A" style={{ marginTop: 20, backgroundColor: darkMode ? "#333" : "#fff" }}>
          <Dragger
            accept=".csv, .xls, .xlsx"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUploadA({ file });
              return false;
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Upload File A (Primary)</p>
          </Dragger>
        </Card>
      )}

      {validationMode === "cross" && !fileB && (
        <Card title="Upload File B" style={{ marginTop: 20, backgroundColor: darkMode ? "#333" : "#fff" }}>
          <Dragger
            accept=".csv, .xls, .xlsx"
            showUploadList={false}
            beforeUpload={(file) => {
              handleUploadB({ file });
              return false;
            }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">Upload File B (Reference)</p>
          </Dragger>
        </Card>
      )}

      {(fileData.length > 0 || fileDataA.length > 0 || fileDataB.length > 0) && (
        <Card title="Uploaded File Preview" style={{ marginTop: 20, backgroundColor: darkMode ? "#333" : "#fff" }}>
          <Text strong>
            Total Rows: {validationMode === "single" ? fileData.length : `${fileDataA.length} (File A), ${fileDataB.length} (File B)`}
          </Text>

          <div style={{ marginTop: 10 }}>
            <Text>Select Validation Type:</Text>
            {validationMode === "single" ? (
              <Select
                style={{ width: 300, marginLeft: 10 }}
                value={dataType}
                onChange={setDataType}
                options={[
                  { label: "Members", value: "members" },
                  { label: "Chart of Accounts", value: "chart-of-accounts" },
                  { label: "Nominees", value: "nominees" },
                  { label: "Customers", value: "customers" },
                  { label: "Vendors", value: "vendors" },
                  { label: "BNK", value: "bank-accounts" },
                  { label: "Fixed Assets", value: "fixed-assets" },
                  { label: "Standing Orders", value: "standing-orders" },
                ]}
              />
            ) : (
              <Select
                style={{ width: 300, marginLeft: 10 }}
                value={dataType}
                onChange={setDataType}
                options={[
                  { label: "Cross Check - Members vs Customers", value: "members-customers" },
                  { label: "Cross Check - Chart vs Vendors", value: "chart-vendors" },
                  { label: "Cross Check - Fixed Assets vs Accounts", value: "assets-accounts" },
                  { label: "Cross Check - Bank vs Nominees", value: "bank-nominees" },
                ]}
              />
            )}
          </div>

          {(validationMode === "single" || fileDataA.length > 0) && (
            <div style={{ marginTop: 20 }}>
              <Text strong>{validationMode === "single" ? "File Data" : "File A"}</Text>
              <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #ddd", padding: 10 }}>
                <Table
                  dataSource={validationMode === "single" ? fileData : fileDataA}
                  columns={Object.keys((validationMode === "single" ? fileData[0] : fileDataA[0]) || {}).map((col) => ({
                    title: col,
                    dataIndex: col,
                    key: col,
                  }))}
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: true }}
                />
              </div>
            </div>
          )}

          {validationMode === "cross" && fileDataB.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <Text strong>File B</Text>
              <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #ddd", padding: 10 }}>
                <Table
                  dataSource={fileDataB}
                  columns={Object.keys(fileDataB[0] || {}).map((col) => ({
                    title: col,
                    dataIndex: col,
                    key: col,
                  }))}
                  pagination={{ pageSize: 5 }}
                  scroll={{ x: true }}
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <Button type="primary" icon={<FileExcelOutlined />} onClick={handleValidate}>
              {validationMode === "single" ? "Validate Data" : "Cross Validate"}
            </Button>
            <Button type="default" icon={<CloseCircleOutlined />} danger onClick={handleClear}>
              Clear File(s)
            </Button>
          </div>
        </Card>
      )}

      {validationResults && (
        <Card title="Validation Errors" style={{ marginTop: 20, backgroundColor: darkMode ? "#444" : "#fafafa" }}>
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