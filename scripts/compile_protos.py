import subprocess

# Download protoc: https://github.com/protocolbuffers/protobuf/releases
subprocess.run("protoc --python_out=. ./protos/*", shell=True)