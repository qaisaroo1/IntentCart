import json

path = r'D:\IntentCart\backend\app\data\catalog.json'
with open(path, 'r', encoding='utf-8') as f:
    catalog = json.load(f)

name_map = {
    # Laptops
    'laptop-001': 'Lenovo ThinkBook 14" Gen 6',
    'laptop-002': 'Acer Aspire 5 15.6" Laptop',
    'laptop-003': 'ASUS Vivobook 15" OLED Laptop',
    'laptop-004': 'Dell Inspiron 14" Laptop',
    'laptop-005': 'HP Pavilion Aero 13.3" Laptop',
    'laptop-006': 'Apple MacBook Air 13" (M2)',
    'laptop-007': 'Lenovo IdeaPad 1 15.6" Laptop',
    'laptop-008': 'Framework 13" Modular Laptop',
    'laptop-009': 'Lenovo Legion 5 Pro Gaming Laptop',
    'laptop-010': 'ASUS Zenbook 14" OLED Laptop',
    'laptop-011': 'Apple MacBook Pro 14" (M3)',
    'laptop-012': 'Dell XPS 13 Plus Ultrabook',
    'laptop-013': 'Lenovo ThinkPad E14 Gen 5 Laptop',
    'laptop-014': 'LG Gram 16" Ultralight Laptop',
    'laptop-015': 'Microsoft Surface Laptop 5 13.5"',
    'laptop-016': 'Razer Blade 14" Gaming Laptop',
    'laptop-017': 'Samsung Galaxy Book4 Pro 14"',
    'laptop-018': 'HP Envy x360 15.6" 2-in-1 Laptop',
    'laptop-019': 'MSI Modern 14" Ultrabook',
    'laptop-020': 'ASUS ROG Zephyrus G14 Gaming Laptop',
    'laptop-021': 'Acer Swift Go 14" OLED Laptop',
    'laptop-022': 'Alienware m16 R2 Gaming Laptop',

    # Monitors
    'monitor-001': 'Dell 27" 4K UHD IPS Monitor',
    'monitor-002': 'LG 24" QHD IPS FreeSync Monitor',
    'monitor-003': 'ASUS ProArt 27" Creator Monitor',
    'monitor-004': 'Samsung ViewFinity 27" 5K Monitor',
    'monitor-005': 'Dell UltraSharp 34" Curved Monitor',
    'monitor-006': 'AOC 24" Frameless 75Hz Monitor',
    'monitor-007': 'LG UltraGear 27" 165Hz QHD Monitor',
    'monitor-008': 'ASUS ZenScreen 15.6" Portable Monitor',
    'monitor-009': 'Alienware 34" QD-OLED Curved Monitor',
    'monitor-010': 'BenQ 27" 4K Designer Monitor',
    'monitor-011': 'Gigabyte 27" QHD 170Hz Gaming Monitor',
    'monitor-012': 'LG DualUp 28" 16:18 Ergo Monitor',
    'monitor-013': 'Samsung Odyssey G7 32" Curved Gaming Monitor',
    'monitor-014': 'Philips 49" SuperWide Curved Monitor',
    'monitor-015': 'ViewSonic 27" ColorPro 2K Monitor',
    'monitor-016': 'Dell 27" 4K USB-C Hub Monitor',
    'monitor-017': 'KTC 27" 165Hz Fast-IPS Gaming Monitor',
    'monitor-018': 'Samsung M8 32" 4K Smart Monitor',

    # Audio & ANC
    'audio-001': 'Sony WH-1000XM4 ANC Headphones',
    'audio-002': 'Anker Soundcore Space One ANC Headphones',
    'audio-003': 'Bose QuietComfort Ultra Headphones',
    'audio-004': 'Apple AirPods Pro 2 (USB-C)',
    'audio-005': 'Sennheiser HD 560S Open-Back Headphones',
    'audio-006': 'Audio-Technica ATH-M20x Bluetooth Headphones',
    'audio-007': 'Jabra Evolve2 65 Flex Wireless Headset',
    'audio-008': 'Sony WF-C500 True Wireless Earbuds',
    'audio-009': 'Sony WH-1000XM5 ANC Headphones',
    'audio-010': 'Bowers & Wilkins Px7 S2e Headphones',
    'audio-011': 'Beyerdynamic DT 770 Pro X Studio Headphones',
    'audio-012': 'Audio-Technica ATH-M50xBT2 Wireless Headphones',
    'audio-013': 'Shure AONIC 50 Gen 2 ANC Headphones',
    'audio-014': 'Nothing Ear (2) Wireless Earbuds',
    'audio-015': 'Marshall Major IV Wireless Headphones',
    'audio-016': 'Beats Studio Pro ANC Headphones',
    'audio-017': 'Anker Soundcore Space Q45 ANC Headphones',
    'audio-018': 'Sennheiser Momentum 4 Wireless Headphones',

    # Keyboards
    'keyboard-001': 'Keychron K2 Pro Wireless Mechanical Keyboard',
    'keyboard-002': 'Logitech MX Keys S Wireless Keyboard',
    'keyboard-003': 'Keychron V1 Custom Mechanical Keyboard',
    'keyboard-004': 'Logitech Ergo K860 Split Ergonomic Keyboard',
    'keyboard-005': 'NuPhy Air75 V2 Low-Profile Mechanical Keyboard',
    'keyboard-006': 'Logitech K380 Multi-Device Bluetooth Keyboard',
    'keyboard-007': 'Razer BlackWidow V4 Pro Mechanical Keyboard',
    'keyboard-008': 'Redragon K552 Compact Mechanical Keyboard',
    'keyboard-009': 'Keychron Q1 Pro Aluminum Mechanical Keyboard',
    'keyboard-010': 'HHKB Pro Hybrid Type-S Keyboard',
    'keyboard-011': 'Ducky One 3 TKL Mechanical Keyboard',
    'keyboard-012': 'Epomaker TH80 Pro Gasket Mechanical Keyboard',
    'keyboard-013': 'Corsair K70 RGB Pro Mechanical Keyboard',
    'keyboard-014': 'SteelSeries Apex Pro TKL Mechanical Keyboard',
    'keyboard-015': 'NuPhy Air96 V2 Low-Profile Mechanical Keyboard',
    'keyboard-016': 'Akko 3068B Plus Wireless Mechanical Keyboard',
    'keyboard-017': 'Das Keyboard 4 Professional Mechanical Keyboard',
    'keyboard-018': 'Logitech MX Mechanical Mini Wireless Keyboard',

    # Mice
    'mouse-001': 'Logitech MX Master 3S Wireless Mouse',
    'mouse-002': 'Logitech Lift Vertical Ergonomic Mouse',
    'mouse-003': 'Razer DeathAdder V3 Pro Wireless Gaming Mouse',
    'mouse-004': 'Logitech MX Anywhere 3S Compact Wireless Mouse',
    'mouse-005': 'Logitech Ergo M575 Wireless Trackball Mouse',
    'mouse-006': 'Logitech Pebble M350 Slim Bluetooth Mouse',
    'mouse-007': 'Logitech G Pro X Superlight 2 Gaming Mouse',
    'mouse-008': 'Pulsar X2V2 Wireless Lightweight Gaming Mouse',
    'mouse-009': 'Kensington Expert Wireless Ergonomic Trackball',
    'mouse-010': 'Anker Ergonomic Vertical Optical Mouse',
    'mouse-011': 'ZOWIE EC2-CW Wireless Esports Gaming Mouse',
    'mouse-012': 'SteelSeries Aerox 3 Wireless Gaming Mouse',

    # Desk Tech
    'tech-001': 'CalDigit TS4 Thunderbolt 4 Dock (18-in-1)',
    'tech-002': 'Anker 555 USB-C Hub (8-in-1)',
    'tech-003': 'Logitech Brio 4K Ultra HD Webcam',
    'tech-004': 'Shure MV7+ Dynamic Podcast Microphone',
    'tech-005': 'BenQ ScreenBar Halo Wireless Monitor Light',
    'tech-006': 'Anker Prime 100W GaN 3-Port Wall Charger',
    'tech-007': 'Quntis ScreenLinear Monitor Light Bar',
    'tech-008': 'Razer Seiren Mini Compact USB Microphone',
    'tech-009': 'Elgato Stream Deck MK.2 Studio Controller',
    'tech-010': 'Rode VideoMic NTG Hybrid Shotgun Microphone',
    'tech-011': 'Anker 778 Thunderbolt 4 Docking Station',
    'tech-012': 'Elgato Key Light Air Professional Studio Light',
}

updated = 0
for p in catalog:
    if p['id'] in name_map:
        p['name'] = name_map[p['id']]
        updated += 1

with open(path, 'w', encoding='utf-8') as f:
    json.dump(catalog, f, indent=2)

print(f"Successfully updated {updated} product names in {path}!")
