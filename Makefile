OUTPUT ?= dots

.PHONY: check-all
check-all:
	bash tests/integration.sh --service mysql --service postgresql --service redis --service http --output $(OUTPUT)

check-%:
	bash tests/integration.sh --service $* --output $(OUTPUT)
