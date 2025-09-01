#!/bin/bash

# Firebase Backup Script
# Creates timestamped backups of Firebase emulator data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
EMULATOR_DATA_DIR="./emulator-data"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="emulator-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        print_info "Creating backup directory..."
        mkdir -p "$BACKUP_DIR"
    fi
}

check_emulator_running() {
    # Check if Firestore emulator is running
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

export_emulator_data() {
    print_info "Exporting emulator data..."
    
    if check_emulator_running; then
        # Export data from running emulator
        firebase emulators:export "$BACKUP_PATH" --force
    else
        print_warning "Emulator not running. Copying existing data if available..."
        if [ -d "$EMULATOR_DATA_DIR" ]; then
            cp -r "$EMULATOR_DATA_DIR" "$BACKUP_PATH"
        else
            print_error "No emulator data found to backup"
            exit 1
        fi
    fi
}

create_metadata() {
    local metadata_file="$BACKUP_PATH/metadata.json"
    
    # Count documents (simplified - would need actual counting)
    local doc_count=0
    if [ -d "$BACKUP_PATH/firestore_export" ]; then
        doc_count=$(find "$BACKUP_PATH/firestore_export" -type f | wc -l)
    fi
    
    # Create metadata JSON
    cat > "$metadata_file" << EOF
{
  "backup_id": "$BACKUP_NAME",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "document_count": $doc_count,
  "collections": ["ingredients", "references", "users"],
  "emulator_running": $(check_emulator_running && echo "true" || echo "false"),
  "backup_path": "$BACKUP_PATH"
}
EOF
    
    print_info "Metadata saved to $metadata_file"
}

validate_backup() {
    print_info "Validating backup..."
    
    if [ ! -d "$BACKUP_PATH" ]; then
        print_error "Backup directory not created"
        return 1
    fi
    
    if [ ! -f "$BACKUP_PATH/metadata.json" ]; then
        print_warning "Metadata file missing"
    fi
    
    # Check for firestore export
    if [ -d "$BACKUP_PATH/firestore_export" ]; then
        print_info "Firestore export found"
    fi
    
    # Check for auth export
    if [ -f "$BACKUP_PATH/auth_export/accounts.json" ]; then
        print_info "Auth export found"
    fi
    
    return 0
}

compress_backup() {
    local compress=$1
    
    if [ "$compress" = "true" ]; then
        print_info "Compressing backup..."
        tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME"
        rm -rf "$BACKUP_PATH"
        BACKUP_PATH="$BACKUP_PATH.tar.gz"
        print_info "Backup compressed to $BACKUP_PATH"
    fi
}

# Main execution
main() {
    print_info "Starting Firebase backup process..."
    print_info "Backup will be saved as: $BACKUP_NAME"
    
    # Parse arguments
    COMPRESS=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            --compress)
                COMPRESS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--compress]"
                echo "  --compress  Compress the backup to tar.gz"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Create backup directory
    create_backup_dir
    
    # Export emulator data
    export_emulator_data
    
    # Create metadata
    create_metadata
    
    # Validate backup
    if validate_backup; then
        print_info "Backup validated successfully"
    else
        print_error "Backup validation failed"
        exit 1
    fi
    
    # Compress if requested
    compress_backup "$COMPRESS"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
    
    print_info "✅ Backup completed successfully!"
    print_info "📁 Location: $BACKUP_PATH"
    print_info "📊 Size: $BACKUP_SIZE"
    
    # List recent backups
    print_info "Recent backups:"
    ls -lht "$BACKUP_DIR" | head -n 6
}

# Run main function
main "$@"