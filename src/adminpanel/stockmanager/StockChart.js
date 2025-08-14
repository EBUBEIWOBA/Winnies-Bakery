import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend 
} from 'recharts';
import { FiAlertTriangle } from 'react-icons/fi';

const StockChart = ({ lowStockItems }) => {
  if (!lowStockItems || lowStockItems.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <FiAlertTriangle className="me-2" />
        No low stock items to display
      </div>
    );
  }

  const data = lowStockItems.map(item => ({
    name: item.name,
    currentStock: item.currentQuantity,
    threshold: item.minThreshold,
    unit: item.unit
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip bg-white p-3 shadow-sm border rounded">
          <p className="mb-1 fw-bold">{label}</p>
          <p className="mb-1">
            <span className="text-primary">Current:</span> {payload[0].value} {payload[0].payload.unit}
          </p>
          <p className="mb-0">
            <span className="text-secondary">Threshold:</span> {payload[1].value} {payload[0].payload.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-3 rounded border">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="currentStock" name="Current Stock">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.currentStock <= 0 ? '#dc3545' : 
                      entry.currentStock <= entry.threshold ? '#ffc107' : '#28a745'} 
              />
            ))}
          </Bar>
          <Bar 
            dataKey="threshold" 
            name="Threshold" 
            fill="#6c757d" 
            opacity={0.3} 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;