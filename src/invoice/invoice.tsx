import React from "react";
import { getLogoPath } from "../utils/assetPath";

const InvoiceTemplate: React.FC = () => {
  return (
    <div className="bg-white py-8">
      {/* A4 container */}
      <div className="mx-auto bg-white p-8 w-[210mm] min-h-[297mm] print:w-full print:min-h-0 print:p-0 print:shadow-none">

        {/* Header */}
        <div className="flex justify-between text-center items-center">
          <div className="flex flex-col justify-center items-center">
            <img
              src={getLogoPath()}
              alt="Company Logo"
              className="w-24 mb-2"
              style={{
                padding : '10px'
              }}
            />
            <h1
            className="font-extrabold text-xl tracking-wide"
            style={{
                padding:"5px"
            }}
            >VOGUE PRISM</h1>
          </div>

          <div className="text-right text-sm">
            <p className="font-semibold text-gray-900">Vogue Vision Ventures PVT LMT.</p>
            <p className="text-gray-600">info@voguevisionventures.com</p>
            <p className="text-gray-600">+91 8412065353</p>
            <p className="text-gray-600">GST IN : 564651515151</p>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-6 border-gray-300" />

        {/* Client & Invoice Info */}
        <div className="flex text-sm "
        style={{
            marginTop:'10px',
            paddingLeft:'5px'
        }}>
         

          <div className="text-gray-700">
            <p>
              Bill No:{" "}
              <span className="text-gray-600">VP0009</span>
            </p>
            <p>
              Bill Date:{" "}
              <span className="text-gray-600">21-Dec-2025, 10:24 am</span>
            </p>
            <p>
              Payment :{" "}
              <span className="text-gray-600">CASH</span>
            </p>
           
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8"
        style={{
            marginTop:'10px',
            padding:'10px'
        }}>
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left border-b">Item</th>
                <th className="p-3 text-right border-b">Qty</th>
                <th className="p-3 text-right border-b">Price</th>
                <th className="p-3 text-right border-b">Amount</th>
              </tr>
            </thead>

            <tbody className="text-gray-700">
              <tr className="border-b">
                <td className="p-3">
                  <p className="font-medium text-gray-900">
                    E-commerce Platform
                  </p>
                  <p className="text-xs text-gray-500">
                    Laravel based e-commerce platform.
                  </p>
                </td>
                <td className="p-3 text-right">500</td>
                <td className="p-3 text-right">₹100.00</td>
                <td className="p-3 text-right">₹5,000.00</td>
              </tr>

              <tr className="border-b">
                <td className="p-3">
                  <p className="font-medium text-gray-900">
                    Frontend Design
                  </p>
                  <p className="text-xs text-gray-500">
                    Vue.js + Tailwind CSS design.
                  </p>
                </td>
                <td className="p-3 text-right">500</td>
                <td className="p-3 text-right">₹100.00</td>
                <td className="p-3 text-right">₹5,000.00</td>
              </tr>

              <tr>
                <td className="p-3">
                  <p className="font-medium text-gray-900">Shop SEO</p>
                  <p className="text-xs text-gray-500">
                    SEO and marketing services.
                  </p>
                </td>
                <td className="p-3 text-right">50</td>
                <td className="p-3 text-right">₹100.00</td>
                <td className="p-3 text-right">₹500.00</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-6"
        style={{
            paddingRight:'10px',
            paddingTop:'15px',
            paddingBottom:'10px'
        }}>
          <div className="w-72 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Subtotal</span>
              <span>₹10,500.00</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Discount</span>
              <span>-₹200</span>
            </div>
            <div className="flex justify-between py-2 font-semibold border-t mt-2">
              <span>Total</span>
              <span>₹11,550.00</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t mt-10 pt-4 text-xs text-gray-500 text-center"
        style={{
            paddingTop:'20px'
        }}>
          Thank You Visit Again....
        </div>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
