.PHONY: run generate_thumbnails_fixed
run:
	@cd backend && go run main.go

generate_thumbnails:
	@bash ./generate_thumbnails_fixed.sh

