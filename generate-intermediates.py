import os

# Icons
icons = sorted([f for f in os.listdir("./public/assets/icons/") if len(f.split('.')) == 2])

base_icons = set(icons)
light_icons = set([icon for icon in icons if '-lt' in icon])
dark_icons = set([icon for icon in icons if '-dark' in icon])
base_icons = base_icons - light_icons - dark_icons

def get_icon_definition(icon):
  icon_name, extension = icon.split('.')
  light_icon = f"{icon_name}-lt.{extension}"
  dark_icon = f"{icon_name}-lt.{extension}"
  return {
    "base": icon,
    "light": light_icon if light_icon in light_icons else icon,
    "dark": dark_icon if dark_icon in dark_icons else icon
  }

iconDefs = { icon: get_icon_definition(icon) for icon in sorted(base_icons) }

with open("./public/assets/js/common/icon-definitions.js", 'w') as f:
  f.write("const Icons = {\n")
  for icon in sorted(base_icons):
    icon_definition = iconDefs[icon]
    base = icon_definition["base"]
    light = icon_definition["light"]
    dark = icon_definition["dark"]
    f.write(f"  \"{icon}\": {{\n")
    f.write(f"    base: \"{base}\",\n")
    f.write(f"    light: \"{light}\",\n")
    f.write(f"    dark: \"{dark}\"\n")
    f.write(f"  }},\n")
  f.write("}\nwindow.Icons = Icons;\n")
