import React from "react";

interface NeuTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
}

export const NeuTable: React.FC<NeuTableProps> = ({ headers, children, className = "" }) => {
  return (
    <div className={`neu-raised rounded-xl overflow-hidden border border-[#D9DADF]/5 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-[#D9DADF]">
          <thead className="bg-[#242724] border-b border-[#8A8B82]/20 text-xs uppercase tracking-wider text-[#8A8B82]">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-5 py-3.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#8A8B82]/10 bg-[#2A2D2A]/60">
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
};
