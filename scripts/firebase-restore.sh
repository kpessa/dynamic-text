#!/bin/bash

# Firebase Restore Script
# Restores Firebase emulator data from backups

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
EMULATOR_DATA_DIR="./emulator-data"

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

print_prompt() {
    echo -e "${BLUE}[?]${NC} $1"
}

list_backups() {
    print_info "Available backups:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ]; then
        print_error "No backup directory found"
        return 1
    fi
    
    local count=0
    for backup in "$BACKUP_DIR"/*; do
        if [ -d "$backup" ] || [[ "$backup" == *.tar.gz ]]; then
            count=$((count + 1))
            local backup_name=$(basename "$backup")
            local backup_size=$(du -sh "$backup" | cut -f1)
            
            # Try to read metadata
            local timestamp="Unknown"
            if [ -f "$backup/metadata.json" ]; then
                timestamp=$(grep '"timestamp"' "$backup/metadata.json" | cut -d'"' -f4)
            fi
            
            printf "  %2d. %-40s %8s  %s\n" "$count" "$backup_name" "$backup_size" "$timestamp"
        fi
    done
    
    if [ $count -eq 0 ]; then
        print_warning "No backups found"
        return 1
    fi
    
    echo ""
    return 0
}

select_backup() {
    local backup_path=""
    
    # If backup ID provided as argument
    if [ -n "$1" ]; then
        if [ -d "$BACKUP_DIR/$1" ]; then
            backup_path="$BACKUP_DIR/$1"
        elif [ -f "$BACKUP_DIR/$1.tar.gz" ]; then
            backup_path="$BACKUP_DIR/$1.tar.gz"
        else
            print_error "Backup not found: $1"
            return 1
        fi
    else
        # Interactive selection
        list_backups || return 1
        
        print_prompt "Enter backup number or name to restore: "
        read -r selection
        
        # If number, convert to backup name
        if [[ "$selection" =~ ^[0-9]+$ ]]; then
            local count=0
            for backup in "$BACKUP_DIR"/*; do
                if [ -d "$backup" ] || [[ "$backup" == *.tar.gz ]]; then
                    count=$((count + 1))
                    if [ $count -eq $selection ]; then
                        backup_path="$backup"
                        break
                    fi
                fi
            done
        else
            # Direct name
            if [ -d "$BACKUP_DIR/$selection" ]; then
                backup_path="$BACKUP_DIR/$selection"
            elif [ -f "$BACKUP_DIR/$selection.tar.gz" ]; then
                backup_path="$BACKUP_DIR/$selection.tar.gz"
            fi
        fi
    fi
    
    if [ -z "$backup_path" ] || [ ! -e "$backup_path" ]; then
        print_error "Invalid backup selection"
        return 1
    fi
    
    echo "$backup_path"
}

extract_backup() {
    local backup_path=$1
    local extracted_path=""
    
    if [[ "$backup_path" == *.tar.gz ]]; then
        print_info "Extracting compressed backup..."
        local backup_name=$(basename "$backup_path" .tar.gz)
        extracted_path="$BACKUP_DIR/$backup_name"
        
        # Extract to temp location
        tar -xzf "$backup_path" -C "$BACKUP_DIR"
    else
        extracted_path="$backup_path"
    fi
    
    echo "$extracted_path"
}

check_emulator_running() {
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

backup_current_data() {
    print_info "Creating backup of current data..."
    
    local timestamp=$(date +"%Y%m%d-%H%M%S")
    local current_backup="$BACKUP_DIR/pre-restore-$timestamp"
    
    if [ -d "$EMULATOR_DATA_DIR" ]; then
        cp -r "$EMULATOR_DATA_DIR" "$current_backup"
        print_info "Current data backed up to: $current_backup"
    else
        print_warning "No current data to backup"
    fi
}

restore_data() {
    local backup_path=$1
    local strategy=$2  # merge or overwrite
    
    print_info "Restoring from: $(basename "$backup_path")"
    print_info "Strategy: $strategy"
    
    if [ "$strategy" = "overwrite" ]; then
        # Remove existing data
        if [ -d "$EMULATOR_DATA_DIR" ]; then
            print_info "Removing existing emulator data..."
            rm -rf "$EMULATOR_DATA_DIR"
        fi
    fi
    
    # Create emulator data directory if it doesn't exist
    mkdir -p "$EMULATOR_DATA_DIR"
    
    # Copy backup data
    print_info "Copying backup data..."
    if [ -d "$backup_path/firestore_export" ]; then
        cp -r "$backup_path/firestore_export" "$EMULATOR_DATA_DIR/"
    fi
    
    if [ -d "$backup_path/auth_export" ]; then
        cp -r "$backup_path/auth_export" "$EMULATOR_DATA_DIR/"
    fi
    
    if [ -d "$backup_path/storage_export" ]; then
        cp -r "$backup_path/storage_export" "$EMULATOR_DATA_DIR/"
    fi
    
    # Copy metadata
    if [ -f "$backup_path/metadata.json" ]; then
        cp "$backup_path/metadata.json" "$EMULATOR_DATA_DIR/.restore_metadata.json"
    fi
    
    print_info "Data restored successfully"
}

import_to_emulator() {
    if check_emulator_running; then
        print_info "Importing data to running emulator..."
        firebase emulators:import "$EMULATOR_DATA_DIR" --force
    else
        print_warning "Emulator not running. Data will be loaded when emulator starts."
    fi
}

validate_restore() {
    print_info "Validating restore..."
    
    if [ ! -d "$EMULATOR_DATA_DIR" ]; then
        print_error "Emulator data directory not found"
        return 1
    fi
    
    # Check for expected directories
    local has_data=false
    if [ -d "$EMULATOR_DATA_DIR/firestore_export" ]; then
        print_info "✓ Firestore data present"
        has_data=true
    fi
    
    if [ -d "$EMULATOR_DATA_DIR/auth_export" ]; then
        print_info "✓ Auth data present"
        has_data=true
    fi
    
    if [ -d "$EMULATOR_DATA_DIR/storage_export" ]; then
        print_info "✓ Storage data present"
        has_data=true
    fi
    
    if [ "$has_data" = false ]; then
        print_error "No data found in restore"
        return 1
    fi
    
    return 0
}

# Main execution
main() {
    print_info "Firebase Restore Utility"
    echo ""
    
    # Parse arguments
    BACKUP_ID=""
    STRATEGY="merge"
    SKIP_CURRENT_BACKUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --backup)
                BACKUP_ID="$2"
                shift 2
                ;;
            --overwrite)
                STRATEGY="overwrite"
                shift
                ;;
            --skip-backup)
                SKIP_CURRENT_BACKUP=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --backup <id>    Specify backup ID to restore"
                echo "  --overwrite      Overwrite existing data (default: merge)"
                echo "  --skip-backup    Skip backing up current data"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Select backup
    BACKUP_PATH=$(select_backup "$BACKUP_ID")
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    print_info "Selected backup: $(basename "$BACKUP_PATH")"
    
    # Extract if compressed
    EXTRACTED_PATH=$(extract_backup "$BACKUP_PATH")
    
    # Confirm restore
    if [ "$STRATEGY" = "overwrite" ]; then
        print_warning "This will DELETE all current emulator data!"
    fi
    
    print_prompt "Proceed with restore? (y/N): "
    read -r confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        print_info "Restore cancelled"
        exit 0
    fi
    
    # Backup current data
    if [ "$SKIP_CURRENT_BACKUP" = false ]; then
        backup_current_data
    fi
    
    # Perform restore
    restore_data "$EXTRACTED_PATH" "$STRATEGY"
    
    # Import to running emulator
    import_to_emulator
    
    # Validate
    if validate_restore; then
        print_info "✅ Restore completed successfully!"
        
        if check_emulator_running; then
            print_info "📡 Emulator is running - data has been imported"
        else
            print_info "💡 Start emulator with: npm run emulator:start"
        fi
    else
        print_error "Restore validation failed"
        exit 1
    fi
    
    # Cleanup extracted files if we extracted a compressed backup
    if [[ "$BACKUP_PATH" == *.tar.gz ]] && [ "$EXTRACTED_PATH" != "$BACKUP_PATH" ]; then
        rm -rf "$EXTRACTED_PATH"
    fi
}

# Run main function
main "$@"