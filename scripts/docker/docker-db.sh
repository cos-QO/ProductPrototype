#!/bin/bash

# Docker PostgreSQL Management Script
# Usage: ./scripts/docker-db.sh [command]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

case "$1" in
    start)
        print_info "Starting PostgreSQL with Docker..."
        docker-compose up -d postgres
        
        print_info "Waiting for PostgreSQL to be ready..."
        sleep 5
        
        # Wait for PostgreSQL to be healthy
        until docker-compose exec postgres pg_isready -U postgres -d queenone_dev; do
            sleep 1
        done
        
        print_success "PostgreSQL is running at localhost:5432"
        print_info "Connection string: postgresql://postgres:postgres123@localhost:5432/queenone_dev"
        ;;
        
    stop)
        print_info "Stopping PostgreSQL..."
        docker-compose stop postgres
        print_success "PostgreSQL stopped"
        ;;
        
    restart)
        $0 stop
        $0 start
        ;;
        
    status)
        docker-compose ps postgres
        ;;
        
    logs)
        docker-compose logs -f postgres
        ;;
        
    shell)
        print_info "Connecting to PostgreSQL shell..."
        docker-compose exec postgres psql -U postgres -d queenone_dev
        ;;
        
    reset)
        print_info "⚠️  This will delete all data! Are you sure? (yes/no)"
        read -r response
        if [ "$response" = "yes" ]; then
            docker-compose down -v
            print_success "Database reset complete"
        else
            print_info "Reset cancelled"
        fi
        ;;
        
    backup)
        BACKUP_FILE="backups/queenone_$(date +%Y%m%d_%H%M%S).sql"
        mkdir -p backups
        print_info "Creating backup to $BACKUP_FILE..."
        docker-compose exec -T postgres pg_dump -U postgres queenone_dev > "$BACKUP_FILE"
        print_success "Backup created: $BACKUP_FILE"
        ;;
        
    restore)
        if [ -z "$2" ]; then
            print_error "Usage: $0 restore <backup_file>"
            exit 1
        fi
        print_info "Restoring from $2..."
        docker-compose exec -T postgres psql -U postgres queenone_dev < "$2"
        print_success "Database restored"
        ;;
        
    pgadmin)
        print_info "Starting pgAdmin..."
        docker-compose up -d pgadmin
        print_success "pgAdmin is running at http://localhost:5050"
        print_info "Login: admin@queenone.local / admin123"
        ;;
        
    *)
        echo "Docker PostgreSQL Management"
        echo "Usage: $0 {start|stop|restart|status|logs|shell|reset|backup|restore|pgadmin}"
        echo ""
        echo "Commands:"
        echo "  start    - Start PostgreSQL container"
        echo "  stop     - Stop PostgreSQL container"
        echo "  restart  - Restart PostgreSQL container"
        echo "  status   - Show container status"
        echo "  logs     - Show PostgreSQL logs"
        echo "  shell    - Connect to PostgreSQL shell"
        echo "  reset    - Delete all data and reset database"
        echo "  backup   - Create database backup"
        echo "  restore  - Restore database from backup"
        echo "  pgadmin  - Start pgAdmin web interface"
        exit 1
        ;;
esac