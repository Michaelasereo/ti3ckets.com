#!/bin/bash

echo "🧹 Starting Docker cleanup..."

# Remove stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove unused images
echo "Removing unused images..."
docker image prune -f

# Remove build cache
echo "Removing build cache..."
docker builder prune -f

# Remove unused volumes (CAREFUL: removes data!)
echo "Removing unused volumes..."
read -p "⚠️  This will remove unused volumes. Continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
else
    echo "Skipping volume cleanup"
fi

# Remove unused networks
echo "Removing unused networks..."
docker network prune -f

# Show current disk usage
echo ""
echo "📊 Current Docker disk usage:"
docker system df

# Mac-specific: Compact Docker.qcow2 file
if [[ "$(uname)" == "Darwin" ]]; then
    echo ""
    echo "🍎 Mac detected - Checking Docker disk image..."
    
    DOCKER_VM_PATH="$HOME/Library/Containers/com.docker.docker/Data/vms/0"
    
    if [ -d "$DOCKER_VM_PATH" ]; then
        cd "$DOCKER_VM_PATH"
        
        if [ -f "Docker.raw" ]; then
            RAW_SIZE=$(du -h Docker.raw | cut -f1)
            echo "Current Docker.raw size: $RAW_SIZE"
            
            read -p "Compact Docker disk image? This requires stopping Docker Desktop. Continue? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "⚠️  Please stop Docker Desktop manually, then run:"
                echo "   cd $DOCKER_VM_PATH"
                echo "   /usr/bin/qemu-img convert -O qcow2 Docker.raw Docker.qcow2"
                echo "   mv Docker.qcow2 Docker.raw"
                echo "   Then restart Docker Desktop"
            fi
        else
            echo "Docker.raw not found. Docker Desktop may be using a different storage format."
        fi
    else
        echo "Docker VM path not found. Docker Desktop may not be installed."
    fi
fi

echo ""
echo "✅ Cleanup complete!"
