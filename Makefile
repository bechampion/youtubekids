.PHONY: run generate_thumbnails_fixed apprun stop xdg
stop:
	@lsof -i tcp:8080 | grep LISTEN | awk '{ print $2 }' | xargs kill -9

run: 
	$(MAKE) apprun &
	$(MAKE) xdg
xdg: 
	xdg-open http://localhost:8080
apprun:
	@cd backend && go run main.go 

generate_thumbnails:
	@bash ./generate_thumbnails_fixed.sh

