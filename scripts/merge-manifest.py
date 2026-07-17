"""
Fusionne android-native/AndroidManifest-additions.xml et
android-native/res/values/strings-additions.xml dans le projet React Native
généré automatiquement par `npx react-native init` en CI.

Ce script fait une insertion de texte simple (pas un vrai parseur XML) car
la structure du manifest généré par React Native est stable et connue.
"""
import re
import sys

APP_DIR = sys.argv[1]  # ex: VoicemailApp

manifest_path = f"{APP_DIR}/android/app/src/main/AndroidManifest.xml"
additions_path = "android-native/AndroidManifest-additions.xml"

with open(additions_path) as f:
    additions = f.read()

# Sépare les <uses-permission> (à insérer juste après <manifest ...>)
# des <service> (à insérer juste avant </application>)
permissions = "\n".join(
    line for line in additions.splitlines() if "<uses-permission" in line
)
services_match = re.search(r"(<service.*?</service>\s*)+", additions, re.DOTALL)
services = services_match.group(0) if services_match else ""

with open(manifest_path) as f:
    manifest = f.read()

# Insère les permissions juste après la balise <manifest ...>
manifest = re.sub(
    r"(<manifest[^>]*>)",
    r"\1\n" + permissions,
    manifest,
    count=1,
)

# Insère les services juste avant </application>
manifest = manifest.replace("</application>", services + "\n</application>")

with open(manifest_path, "w") as f:
    f.write(manifest)

# Fusionne strings.xml
strings_path = f"{APP_DIR}/android/app/src/main/res/values/strings.xml"
strings_additions_path = "android-native/res/values/strings-additions.xml"

with open(strings_additions_path) as f:
    new_strings = f.read()

new_string_blocks = re.findall(r"<string.*?</string>", new_strings, re.DOTALL)
new_string_lines = "\n".join(new_string_blocks)

with open(strings_path) as f:
    strings = f.read()

strings = strings.replace("</resources>", new_string_lines + "\n</resources>")

with open(strings_path, "w") as f:
    f.write(strings)

print("Manifest et strings.xml fusionnés avec succès.")
