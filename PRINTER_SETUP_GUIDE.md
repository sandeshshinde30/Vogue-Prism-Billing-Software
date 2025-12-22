# XPrinter VM-320 80mm Thermal Printer Setup Guide

## Overview
This guide will help you set up and configure your XPrinter VM-320 80mm thermal printer with the Vogue Prism Billing Software on Linux.

## Prerequisites
- XPrinter VM-320 80mm thermal printer
- Linux operating system (Ubuntu/Debian recommended)
- CUPS (Common Unix Printing System) installed
- USB cable or network connection

## Hardware Setup

### 1. Connect the Printer
- **USB Connection**: Connect the printer to your computer using a USB cable
- **Network Connection**: Connect via Ethernet or configure WiFi (if supported)
- **Power**: Ensure the printer is powered on and ready

### 2. Load Paper
- Open the printer cover
- Insert 80mm thermal paper roll
- Ensure paper feeds correctly
- Close the cover

## Linux Driver Installation

### 1. Install CUPS
```bash
sudo apt update
sudo apt install cups cups-client
sudo systemctl enable cups
sudo systemctl start cups
```

### 2. Add Printer via CUPS Web Interface
1. Open browser and go to `http://localhost:631`
2. Click "Administration" → "Add Printer"
3. Select your XPrinter from the list
4. Choose appropriate driver:
   - Generic → Generic Text-Only Printer
   - Or download specific XPrinter drivers from manufacturer

### 3. Command Line Setup (Alternative)
```bash
# List available printers
lpstat -p -d

# Add printer manually
sudo lpadmin -p XPrinter-VM320 -E -v usb://XPrinter/VM-320 -m drv:///sample.drv/generic.ppd

# Set as default (optional)
sudo lpadmin -d XPrinter-VM320
```

### 4. Test Basic Printing
```bash
# Test print
echo "Test Print" | lp -d XPrinter-VM320

# Check printer status
lpstat -p XPrinter-VM320
```

## Software Configuration

### 1. Open Printer Management
1. Launch Vogue Prism Billing Software
2. Navigate to **Printer Management** from the sidebar
3. Click **Refresh Printers** to detect available printers

### 2. Configure Printer Settings
1. Go to the **Printer Settings** tab
2. Configure the following:
   - **Selected Printer**: Choose your XPrinter VM-320
   - **Paper Width**: Select "80mm (Standard Thermal)"
   - **Print Density**: Medium (adjust based on print quality)
   - **Print Speed**: Medium (balance between speed and quality)
   - **Character Encoding**: UTF-8 (Unicode)
   - **Auto-print**: Enable for automatic receipt printing
   - **Auto-cut**: Enable if your printer supports paper cutting

### 3. Test Printing
1. In the **Available Printers** tab, find your XPrinter
2. Click **Test Print** to send a sample receipt
3. Verify the print quality and formatting

## Troubleshooting

### Common Issues

#### Printer Not Detected
```bash
# Check USB connection
lsusb | grep -i printer

# Restart CUPS service
sudo systemctl restart cups

# Check printer status
lpstat -p -d
```

#### Print Quality Issues
- **Too Light**: Increase print density in settings
- **Too Dark**: Decrease print density
- **Blurry**: Check paper quality and printer head cleanliness
- **Incomplete**: Verify paper width setting (80mm)

#### Permission Issues
```bash
# Add user to lp group
sudo usermod -a -G lp $USER

# Set printer permissions
sudo chmod 666 /dev/usb/lp*
```

#### Network Printer Issues
```bash
# For network printers, use IP address
sudo lpadmin -p XPrinter-Network -E -v ipp://192.168.1.100:631/printers/XPrinter -m drv:///sample.drv/generic.ppd
```

### Advanced Configuration

#### Custom Paper Size
```bash
# Create custom paper size for 80mm thermal
sudo lpadmin -p XPrinter-VM320 -o media=Custom.80x200mm
```

#### Print Options
```bash
# Set default options
sudo lpadmin -p XPrinter-VM320 -o print-quality=4 -o print-speed=normal
```

## Features

### Dynamic Printer Detection
- Automatically detects all available printers
- Shows printer status (idle, printing, offline)
- Displays printer details (location, model, capabilities)

### Advanced Settings
- Paper width configuration (58mm/80mm)
- Print density control (light/medium/dark)
- Print speed adjustment (slow/medium/fast)
- Character encoding options
- Auto-print and auto-cut settings

### Test Printing
- Comprehensive test receipts with sample bill format
- Real-time printer status checking
- Error reporting and diagnostics

### Bill Formatting
- Optimized for thermal printers
- Automatic text wrapping and alignment
- Currency formatting
- Professional receipt layout
- Support for multiple payment modes

## Best Practices

### 1. Paper Management
- Use high-quality 80mm thermal paper
- Store paper in cool, dry place
- Replace paper when print quality degrades

### 2. Printer Maintenance
- Clean printer head regularly with isopropyl alcohol
- Keep printer dust-free
- Check for paper jams regularly

### 3. Software Settings
- Test print after any configuration changes
- Keep printer drivers updated
- Monitor print queue for stuck jobs

### 4. Performance Optimization
- Use medium print density for best quality/speed balance
- Enable auto-cut only if printer supports it
- Set appropriate paper width to avoid formatting issues

## Support

### Log Files
- Application logs: Check the Logs section in the software
- CUPS logs: `/var/log/cups/error_log`
- System logs: `journalctl -u cups`

### Useful Commands
```bash
# Check printer queue
lpq -P XPrinter-VM320

# Cancel all print jobs
cancel -a

# Restart printer
sudo cupsdisable XPrinter-VM320
sudo cupsenable XPrinter-VM320
```

### Getting Help
1. Check printer status in Printer Management
2. Review error messages in the application
3. Test with basic text printing first
4. Verify CUPS configuration
5. Check hardware connections

## Conclusion
With proper setup, your XPrinter VM-320 will provide reliable thermal printing for receipts and bills. The dynamic printer management system ensures easy configuration and maintenance of your printing setup.