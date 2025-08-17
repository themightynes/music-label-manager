{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    nodePackages.npm
    docker
    docker-compose
    postgresql_16
    curl
    jq
  ];
  
  shellHook = ''
    echo "🎵 Music Label Manager Development Environment"
    echo "Available commands:"
    echo "  npm run dev          - Direct development (port 5000)"
    echo "  npm run docker:dev   - Containerized development (port 3001)"
    echo "  npm run docker:app   - Containerized production (port 5000)"
    echo ""
    echo "Docker status:"
    if command -v docker >/dev/null 2>&1; then
      echo "  ✅ Docker available"
    else
      echo "  ❌ Docker not available - using direct mode"
    fi
  '';
}