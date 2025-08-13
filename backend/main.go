package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type MediaFile struct {
	Name      string `json:"name"`
	VideoPath string `json:"video_path"`
	ThumbPath string `json:"thumb_path,omitempty"`
	HasThumb  bool   `json:"has_thumb"`
}

type ScanResult struct {
	TotalVideos      int         `json:"total_videos"`
	VideosWithThumbs int         `json:"videos_with_thumbs"`
	MediaFiles       []MediaFile `json:"media_files"`
}

func loadThumbnailMapping(rootDir string) map[string]string {
	mapping := make(map[string]string)
	mappingFile := filepath.Join(rootDir, "thumbnail_mapping.json")

	if data, err := os.ReadFile(mappingFile); err == nil {
		json.Unmarshal(data, &mapping)
	}

	return mapping
}

func scanMediaFiles(rootDir string) (*ScanResult, error) {
	videoFiles := make(map[string]string) // basename -> full path
	webpFiles := make(map[string]string)  // basename -> full path

	// Load thumbnail mapping for simplified names
	thumbnailMapping := loadThumbnailMapping(rootDir)

	// Walk current directory and one level of subdirectories
	err := filepath.Walk(rootDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip if it's deeper than one level
		relPath, err := filepath.Rel(rootDir, path)
		if err != nil {
			return err
		}

		// Count directory separators to determine depth
		depth := strings.Count(relPath, string(os.PathSeparator))
		if depth > 1 {
			return nil
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(path))
		basename := strings.TrimSuffix(filepath.Base(path), ext)

		switch ext {
		case ".webm", ".mp4":
			videoFiles[basename] = path
		case ".webp":
			webpFiles[basename] = path
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	// Match videos with thumbnails
	var mediaFiles []MediaFile
	videosWithThumbs := 0

	for basename, videoPath := range videoFiles {
		mediaFile := MediaFile{
			Name:      basename,
			VideoPath: videoPath,
			HasThumb:  false,
		}

		// First try direct match
		if thumbPath, exists := webpFiles[basename]; exists {
			mediaFile.ThumbPath = thumbPath
			mediaFile.HasThumb = true
			videosWithThumbs++
		} else if mappedName, exists := thumbnailMapping[basename]; exists {
			// Try mapped simplified name
			if thumbPath, exists := webpFiles[mappedName]; exists {
				mediaFile.ThumbPath = thumbPath
				mediaFile.HasThumb = true
				videosWithThumbs++
			}
		}

		mediaFiles = append(mediaFiles, mediaFile)
	}

	result := &ScanResult{
		TotalVideos:      len(videoFiles),
		VideosWithThumbs: videosWithThumbs,
		MediaFiles:       mediaFiles,
	}

	return result, nil
}

func handleAPIRequest(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Get current directory
	currentDir, err := os.Getwd()
	childDir := filepath.Join(currentDir, "../")
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Error getting current directory: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Scan for media files
	result, err := scanMediaFiles(childDir)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Error scanning files: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Return JSON response
	json.NewEncoder(w).Encode(result)
}

func handleStaticFiles(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers for static files
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	// Get current directory (backend directory)
	currentDir, err := os.Getwd()
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Parent directory (project root)
	rootDir := filepath.Join(currentDir, "../")

	// Clean the URL path and join with root directory
	cleanPath := filepath.Clean(r.URL.Path)
	if strings.HasPrefix(cleanPath, "/") {
		cleanPath = cleanPath[1:]
	}

	// If root path, serve index.html
	if cleanPath == "" || cleanPath == "." {
		cleanPath = "index.html"
	}

	filePath := filepath.Join(rootDir, cleanPath)

	// Security check: ensure the file is within the root directory
	absRoot, err := filepath.Abs(rootDir)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	absFile, err := filepath.Abs(filePath)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	if !strings.HasPrefix(absFile, absRoot) {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Check if file exists
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// Serve the file
	http.ServeFile(w, r, filePath)
}

func main() {
	// Handle API endpoint for media scanning
	http.HandleFunc("/api/media", handleAPIRequest)

	// Handle static file serving for everything else
	http.HandleFunc("/", handleStaticFiles)

	port := ":8080"
	fmt.Printf("[LocalTubeKids] Starting combined media scanner and file server on http://localhost%s\n", port)
	fmt.Printf("[LocalTubeKids] API endpoint: /api/media\n")
	fmt.Printf("[LocalTubeKids] Static files: serving from project root\n")
	fmt.Printf("[LocalTubeKids] Scanning for WebM/MP4/WebP files\n")

	log.Fatal(http.ListenAndServe(port, nil))
}
