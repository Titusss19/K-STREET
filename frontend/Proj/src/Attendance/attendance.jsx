import React, { useState, useEffect } from "react";
import {
  Plus,
  Eye,
  Calendar,
  X,
  Trash2,
  Search,
  Users,
  LogIn,
  LogOut,
  Download,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function AttendancePortal() {
  const [employees, setEmployees] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTimeInOutModal, setShowTimeInOutModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successType, setSuccessType] = useState("success");

  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    address: "",
    contactNumber: "",
    dailyRate: "",
    pin: "",
  });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddEmployee = () => {
    if (
      !formData.name ||
      !formData.username ||
      !formData.email ||
      !formData.pin ||
      !formData.address ||
      !formData.contactNumber
    ) {
      setSuccessMessage(
        "Please fill in all required fields (Daily Rate is optional)"
      );
      setSuccessType("error");
      setShowSuccessModal(true);
      return;
    }

    if (formData.pin.length < 4) {
      setSuccessMessage("PIN must be at least 4 digits");
      setSuccessType("error");
      setShowSuccessModal(true);
      return;
    }

    const newEmployee = {
      id: Date.now(),
      ...formData,
      attendanceRecords: [],
      joinDate: new Date().toLocaleDateString(),
      isOnDuty: false,
      currentTimeIn: null,
    };

    setEmployees((prev) => [...prev, newEmployee]);
    setFormData({
      name: "",
      username: "",
      email: "",
      address: "",
      contactNumber: "",
      dailyRate: "",
      pin: "",
    });
    setShowAddForm(false);
    setSuccessMessage(`${newEmployee.name} added successfully`);
    setSuccessType("success");
    setShowSuccessModal(true);
  };

  const handleViewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const handleOpenTimeInOut = (employee) => {
    setSelectedEmployee(employee);
    setPinInput("");
    setPinError("");
    setShowTimeInOutModal(true);
  };

  const handleTimeInOut = () => {
    if (!pinInput) {
      setPinError("Enter PIN");
      return;
    }

    if (selectedEmployee.pin !== pinInput) {
      setPinError("Incorrect PIN");
      setPinInput("");
      return;
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const updatedEmployees = employees.map((emp) => {
      if (emp.id === selectedEmployee.id) {
        if (!emp.isOnDuty) {
          // Time In
          return {
            ...emp,
            isOnDuty: true,
            currentTimeIn: now,
            attendanceRecords: [
              ...(emp.attendanceRecords || []),
              {
                date: new Date().toISOString().split("T")[0],
                timeIn: timeString,
                timeOut: null,
                status: "on-duty",
                fullDate: new Date(),
              },
            ],
          };
        } else {
          // Time Out
          const todayIndex = emp.attendanceRecords.findIndex(
            (r) =>
              r.date === new Date().toISOString().split("T")[0] &&
              r.timeOut === null
          );

          if (todayIndex !== -1) {
            const updatedRecords = [...emp.attendanceRecords];
            updatedRecords[todayIndex].timeOut = timeString;
            updatedRecords[todayIndex].status = "completed";
            return {
              ...emp,
              isOnDuty: false,
              currentTimeIn: null,
              attendanceRecords: updatedRecords,
            };
          }
          return emp;
        }
      }
      return emp;
    });

    const updatedEmp = updatedEmployees.find(
      (e) => e.id === selectedEmployee.id
    );
    setEmployees(updatedEmployees);
    setShowTimeInOutModal(false);
    setPinInput("");
    setPinError("");

    setSuccessMessage(
      updatedEmp.isOnDuty
        ? `${updatedEmp.name} clocked in successfully`
        : `${updatedEmp.name} clocked out successfully`
    );
    setSuccessType("success");
    setShowSuccessModal(true);
  };

  const handleDeleteEmployee = (id, name) => {
    if (confirm(`Delete ${name}? This action cannot be undone.`)) {
      setEmployees((prev) => prev.filter((emp) => emp.id !== id));
      setSuccessMessage(`${name} removed from system`);
      setSuccessType("success");
      setShowSuccessModal(true);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTodayRecord = (employee) => {
    const today = new Date().toISOString().split("T")[0];
    return employee.attendanceRecords?.find((record) => record.date === today);
  };

  const getAttendanceStats = (employee) => {
    const records = employee.attendanceRecords || [];
    return {
      total: records.length,
      completed: records.filter((r) => r.timeOut).length,
      onDuty: records.filter((r) => !r.timeOut && r.timeIn).length,
    };
  };

  const calculateWorkHours = (timeIn, timeOut) => {
    if (!timeIn || !timeOut)
      return { regular: 0, ot: 0, late: 0, display: "—" };

    const [inHour, inMin, inSec] = timeIn.split(":").map(Number);
    const [outHour, outMin, outSec] = timeOut.split(":").map(Number);

    const inDate = new Date(0, 0, 0, inHour, inMin, inSec);
    const outDate = new Date(0, 0, 0, outHour, outMin, outSec);

    const diffMs = outDate - inDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    const WORK_HOURS = 8;
    let regular = Math.min(diffHours, WORK_HOURS);
    let ot = Math.max(0, diffHours - WORK_HOURS);

    // Check if late (assumed work starts at 8:00 AM)
    const workStartHour = 8;
    let late = 0;
    if (inHour > workStartHour || (inHour === workStartHour && inMin > 0)) {
      const lateMinutes = (inHour - workStartHour) * 60 + inMin;
      late = Math.round((lateMinutes / 60) * 10) / 10;
    }

    const displayHours = diffHours.toFixed(2);
    const display = `${displayHours}h`;

    return { regular, ot, late, display, diffHours };
  };

  const formatTimeDisplay = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };

  const generatePDF = () => {
    if (!selectedEmployee) return;

    // Create a temporary container for PDF generation
    const pdfContainer = document.createElement("div");
    pdfContainer.style.position = "absolute";
    pdfContainer.style.left = "-9999px";
    pdfContainer.style.top = "0";
    pdfContainer.style.width = "794px"; // A4 width in pixels
    pdfContainer.style.padding = "40px";
    pdfContainer.style.backgroundColor = "white";
    pdfContainer.style.fontFamily = "Arial, sans-serif";
    pdfContainer.style.fontSize = "12px";

    // Get data
    const stats = getAttendanceStats(selectedEmployee);
    const records = selectedEmployee.attendanceRecords || [];

    // Create HTML content
    let tableRows = "";
    records
      .slice()
      .reverse()
      .forEach((record) => {
        const workData = calculateWorkHours(record.timeIn, record.timeOut);
        const dateStr = new Date(record.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        tableRows += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px;">${dateStr}</td>
          <td style="padding: 8px;">${record.timeIn}</td>
          <td style="padding: 8px;">${record.timeOut || "On Duty"}</td>
          <td style="padding: 8px;">${workData.display}</td>
          <td style="padding: 8px;">${
            workData.late > 0 ? formatTimeDisplay(workData.late) : "—"
          }</td>
          <td style="padding: 8px;">${
            workData.ot > 0 ? formatTimeDisplay(workData.ot) : "—"
          }</td>
          <td style="padding: 8px;">
            <span style="background-color: ${
              record.status === "completed" ? "#d1fae5" : "#dbeafe"
            }; 
                      color: ${
                        record.status === "completed" ? "#065f46" : "#1e40af"
                      };
                      padding: 4px 8px;
                      border-radius: 4px;
                      font-size: 11px;
                      font-weight: 600;">
              ${record.status === "completed" ? "Completed" : "On Duty"}
            </span>
          </td>
        </tr>
      `;
      });

    pdfContainer.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #dc2626; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 24px; color: #1f2937;">DAILY TIME RECORD (DTR)</h1>
        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">K-Street Gerona, Tarlac</p>
      </div>
      
      <div style="margin-bottom: 25px;">
        <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold; color: #374151;">EMPLOYEE INFORMATION</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
          <div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Full Name:</span>
              <span>${selectedEmployee.name}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Username:</span>
              <span>@${selectedEmployee.username}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Email:</span>
              <span>${selectedEmployee.email}</span>
            </div>
          </div>
          <div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Address:</span>
              <span>${selectedEmployee.address || "N/A"}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Contact Number:</span>
              <span>${selectedEmployee.contactNumber || "N/A"}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #555; display: inline-block; width: 140px;">Daily Rate:</span>
              <span>${
                selectedEmployee.dailyRate
                  ? `₱${selectedEmployee.dailyRate}`
                  : "N/A"
              }</span>
            </div>
          </div>
        </div>
      </div>
      
      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; text-align: center; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${
            stats.total
          }</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">Total Days</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${
            stats.completed
          }</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">Completed</div>
        </div>
        <div style="flex: 1; text-align: center; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${
            stats.onDuty
          }</div>
          <div style="font-size: 12px; color: #666; margin-top: 5px;">On Duty</div>
        </div>
      </div>
      
      <div style="margin-bottom: 15px; font-size: 16px; font-weight: bold; color: #374151;">ATTENDANCE HISTORY</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #dc2626; color: white;">
            <th style="padding: 10px; text-align: left;">Date</th>
            <th style="padding: 10px; text-align: left;">Time In</th>
            <th style="padding: 10px; text-align: left;">Time Out</th>
            <th style="padding: 10px; text-align: left;">Total Hours</th>
            <th style="padding: 10px; text-align: left;">Late</th>
            <th style="padding: 10px; text-align: left;">OT Hours</th>
            <th style="padding: 10px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 15px;">
        <p style="margin: 0;">Generated on ${new Date().toLocaleString()}</p>
        <p style="margin: 5px 0 0 0;">This is an official document of K-Street Gerona, Tarlac</p>
      </div>
    `;

    // Add to document
    document.body.appendChild(pdfContainer);

    // Generate PDF
    html2canvas(pdfContainer, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        // Save the PDF
        pdf.save(
          `DTR_${selectedEmployee.name.replace(/\s+/g, "_")}_${
            new Date().toISOString().split("T")[0]
          }.pdf`
        );

        // Clean up
        document.body.removeChild(pdfContainer);
      })
      .catch((error) => {
        console.error("Error generating PDF:", error);
        document.body.removeChild(pdfContainer);

        // Fallback to simple text PDF
        const pdfFallback = new jsPDF();
        pdfFallback.setFontSize(16);
        pdfFallback.text(`DTR - ${selectedEmployee.name}`, 20, 20);
        pdfFallback.setFontSize(12);
        pdfFallback.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        pdfFallback.text(`K-Street Gerona, Tarlac`, 20, 40);
        pdfFallback.save(
          `DTR_${selectedEmployee.name.replace(/\s+/g, "_")}_${
            new Date().toISOString().split("T")[0]
          }.pdf`
        );
      });
  };

  // Rest of the component remains the same...
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="">
                    <span className="text-white font-bold text-xl">
                      <img
                        src="https://github.com/Titusss19/K-STREET/blob/main/frontend/Proj/src/assets/kslogo.png?raw=true"
                        alt="K-Street Logo"
                        className="h-20 w-auto"
                      />
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      K - STREET Attendance 
                    </h1>
                    <p className="text-sm text-slate-500">
                      {currentTime.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      •{" "}
                      {currentTime.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
              >
                <Plus size={18} />
                Add Employee
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 py-8">
          {/* Search and Stats */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name, username, or email..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-slate-200">
                <Users size={18} className="text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  {filteredEmployees.length} / {employees.length}
                </span>
              </div>
            </div>
          </div>

          {/* Employee List */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <Users size={40} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {employees.length === 0
                  ? "No employees yet"
                  : "No results found"}
              </h3>
              <p className="text-sm text-slate-500">
                {employees.length === 0
                  ? "Create your first employee record to get started"
                  : "Try adjusting your search criteria"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees.map((emp) => {
                const todayRecord = getTodayRecord(emp);
                const stats = getAttendanceStats(emp);

                return (
                  <div
                    key={emp.id}
                    className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-6">
                      {/* Employee Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                        
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900 text-sm">
                                {emp.name}
                              </h3>
                              {emp.isOnDuty && (
                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">
                                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
                                  On Duty
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">
                              @{emp.username}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 font-medium mb-1">
                              Email
                            </p>
                            <p className="text-xs text-slate-900 truncate font-medium">
                              {emp.email}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 font-medium mb-1">
                              Contact
                            </p>
                            <p className="text-xs text-red-600 font-bold">
                              {emp.contactNumber || "—"}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 font-medium mb-1">
                              Records
                            </p>
                            <p className="text-xs text-slate-900 font-bold">
                              {stats.total}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 font-medium mb-1">
                              Completed
                            </p>
                            <p className="text-xs text-green-600 font-bold">
                              {stats.completed}
                            </p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-3">
                            <p className="text-xs text-slate-600 font-medium mb-1">
                              Today
                            </p>
                            <p
                              className={`text-xs font-bold ${
                                todayRecord
                                  ? emp.isOnDuty
                                    ? "text-green-600"
                                    : "text-blue-600"
                                  : "text-slate-400"
                              }`}
                            >
                              {todayRecord
                                ? emp.isOnDuty
                                  ? "On Duty"
                                  : "Clocked Out"
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleOpenTimeInOut(emp)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1"
                          title="Time In / Time Out"
                        >
                          {emp.isOnDuty ? (
                            <>
                              <LogOut size={18} />
                              Out
                            </>
                          ) : (
                            <>
                              <LogIn size={18} />
                              In
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleViewEmployee(emp)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-slate-600 hover:text-red-600"
                          title="Delete employee"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Add Employee</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  placeholder="Enter contact number"
                  value={formData.contactNumber}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Daily Rate (Optional)
                </label>
                <input
                  type="number"
                  name="dailyRate"
                  placeholder="Enter daily rate"
                  value={formData.dailyRate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  PIN (4+ digits for Time In/Out) *
                </label>
                <input
                  type="password"
                  name="pin"
                  placeholder="Enter PIN"
                  value={formData.pin}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Required for time in/out authentication
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAddEmployee}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm"
                >
                  Add Employee
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">
                * Required fields (Daily Rate is optional)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-slate-900">Employee Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={generatePDF}
                  className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-medium"
                  title="Download DTR as PDF"
                >
                  <Download size={18} />
                  Download PDF
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-200">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                    selectedEmployee.isOnDuty
                      ? "bg-gradient-to-br from-green-400 to-green-600"
                      : "bg-gradient-to-br from-red-400 to-red-600"
                  }`}
                >
                  {selectedEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {selectedEmployee.name}
                  </h3>
                  <p className="text-sm text-slate-500">
                    @{selectedEmployee.username}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">
                    Email
                  </p>
                  <p className="text-sm text-slate-900 break-all">
                    {selectedEmployee.email}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">
                    Address
                  </p>
                  <p className="text-sm text-slate-900">
                    {selectedEmployee.address || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">
                    Contact Number
                  </p>
                  <p className="text-sm text-slate-900">
                    {selectedEmployee.contactNumber || "—"}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-600 font-medium mb-2">
                    Daily Rate
                  </p>
                  <p className="text-sm font-bold text-red-600">
                    {selectedEmployee.dailyRate
                      ? `₱${selectedEmployee.dailyRate}`
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <p className="text-xs text-slate-600 font-medium mb-3">
                  Summary
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {getAttendanceStats(selectedEmployee).total}
                    </p>
                    <p className="text-xs text-slate-600">Total</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {getAttendanceStats(selectedEmployee).completed}
                    </p>
                    <p className="text-xs text-slate-600">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {getAttendanceStats(selectedEmployee).onDuty}
                    </p>
                    <p className="text-xs text-slate-600">On Duty</p>
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div>
                <p className="text-xs text-slate-600 font-medium mb-3">
                  Attendance History
                </p>
                {selectedEmployee.attendanceRecords &&
                selectedEmployee.attendanceRecords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Time In
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Time Out
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Total Hours
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            Late
                          </th>
                          <th className="px-4 py-2 text-left font-semibold text-slate-900">
                            OT Hours
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...selectedEmployee.attendanceRecords]
                          .reverse()
                          .map((record, idx) => {
                            const workData = calculateWorkHours(
                              record.timeIn,
                              record.timeOut
                            );
                            return (
                              <tr
                                key={idx}
                                className="border-b border-slate-200 hover:bg-slate-50"
                              >
                                <td className="px-4 py-3 text-slate-900">
                                  {new Date(record.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-medium">
                                  {record.timeIn}
                                </td>
                                <td className="px-4 py-3 text-slate-900 font-medium">
                                  {record.timeOut || (
                                    <span className="text-blue-600 font-semibold">
                                      On Duty
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      record.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-100 text-blue-700"
                                    }`}
                                  >
                                    {record.status === "completed"
                                      ? "Completed"
                                      : "On Duty"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-900">
                                  {workData.display}
                                </td>
                                <td className="px-4 py-3 text-slate-900">
                                  {workData.late > 0
                                    ? formatTimeDisplay(workData.late)
                                    : "—"}
                                </td>
                                <td className="px-4 py-3 text-slate-900">
                                  {workData.ot > 0
                                    ? formatTimeDisplay(workData.ot)
                                    : "—"}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-8">
                    No attendance records yet
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time In / Out Modal */}
      {showTimeInOutModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  {selectedEmployee.isOnDuty ? "Clock Out" : "Clock In"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedEmployee.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTimeInOutModal(false);
                  setPinInput("");
                  setPinError("");
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <p className="text-sm text-slate-700 font-medium mb-2">
                  Current Time
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Enter PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError("");
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleTimeInOut();
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 text-center text-lg font-bold tracking-widest ${
                    pinError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-slate-200 focus:ring-red-500"
                  }`}
                />
                {pinError && (
                  <p className="text-sm text-red-600 mt-1 text-center">
                    {pinError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleTimeInOut}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm"
                >
                  {selectedEmployee.isOnDuty ? "Clock Out" : "Clock In"}
                </button>
                <button
                  onClick={() => {
                    setShowTimeInOutModal(false);
                    setPinInput("");
                    setPinError("");
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-900 py-2 rounded-lg transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-sm w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    successType === "success" ? "bg-green-100" : "bg-red-100"
                  }`}
                >
                  <span
                    className={`text-xl ${
                      successType === "success"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {successType === "success" ? "✓" : "!"}
                  </span>
                </div>
                <p className="font-semibold text-slate-900">
                  {successType === "success" ? "Success" : "Error"}
                </p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-sm mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendancePortal;
