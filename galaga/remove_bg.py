from PIL import Image
import os

images = ["player_ship.png", "enemy_drone.png", "enemy_interceptor.png", "enemy_commander.png"]

for img_name in images:
    if not os.path.exists(img_name):
        continue
        
    img = Image.open(img_name).convert("RGBA")
    datas = img.getdata()
    
    newData = []
    for item in datas:
        # Check if the pixel is close to black (handling the dark backgrounds)
        # Assuming the ship pixels have higher RGB values than the background
        # We need a strict threshold because the inner parts of the ship must not become transparent
        r, g, b, a = item
        
        # Simple thresholding: if it's very dark, make it fully transparent
        if r < 30 and g < 30 and b < 30:
            newData.append((r, g, b, 0))
        elif r == 255 and g == 0 and b == 255: # Handling potential magenta backgrounds
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)
            
    img.putdata(newData)
    img.save(img_name, "PNG")
    print(f"Processed {img_name}")
